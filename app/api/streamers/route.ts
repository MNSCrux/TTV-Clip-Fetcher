import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import {
  parseOptionalListId,
  resolveStreamerListId,
} from '@/lib/streamer-lists';

const prisma = new PrismaClient();

async function ensureListEntry(
  listId: number,
  streamerId: number,
  active: boolean
) {
  await prisma.streamerListEntry.upsert({
    where: {
      streamer_list_id_streamer_id: {
        streamer_list_id: listId,
        streamer_id: streamerId,
      },
    },
    create: {
      streamer_list_id: listId,
      streamer_id: streamerId,
      active,
    },
    update: { active },
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';
    const search = searchParams.get('search');
    const listId = await resolveStreamerListId(
      parseOptionalListId(searchParams.get('listId'))
    );

    const entries = await prisma.streamerListEntry.findMany({
      where: {
        streamer_list_id: listId,
        ...(activeOnly ? { active: true } : {}),
        ...(search
          ? {
              streamer: {
                OR: [
                  { handle: { contains: search } },
                  { display_name: { contains: search } },
                ],
              },
            }
          : {}),
      },
      include: { streamer: true },
      orderBy: { streamer: { handle: 'asc' } },
    });

    const streamers = entries.map((entry) => ({
      ...entry.streamer,
      active: entry.active,
    }));

    return NextResponse.json(streamers);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch streamers';
    const status = message.includes('not found') || message.includes('No active') ? 400 : 500;
    console.error('Error fetching streamers:', error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json();
      const listId = await resolveStreamerListId(body.listId);
      const handle = String(body.handle ?? '').trim().replace(/^@/, '').toLowerCase();
      if (!handle) {
        return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
      }
      if (!/^[a-z0-9_]{3,25}$/.test(handle)) {
        return NextResponse.json({ error: 'Invalid Twitch handle' }, { status: 400 });
      }
      const streamer = await prisma.streamer.upsert({
        where: { handle },
        create: {
          handle,
          display_name: handle,
          active: body.active !== false,
        },
        update: {},
      });
      await ensureListEntry(listId, streamer.id, body.active !== false);
      return NextResponse.json({ ...streamer, active: body.active !== false });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = String(formData.get('mode') || 'append');
    const listId = await resolveStreamerListId(
      formData.get('listId') ? String(formData.get('listId')) : undefined
    );

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const content = await file.text();
    const records = parse(content, {
      skip_empty_lines: true,
      trim: true,
    }) as string[][];

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV has no streamer rows' }, { status: 400 });
    }

    const firstRow = records[0].map((cell) => String(cell).trim().toLowerCase());
    const handleColumnIndex = firstRow.indexOf('handle');
    const hasHeader = handleColumnIndex >= 0;
    const dataRows = hasHeader ? records.slice(1) : records;
    const importHandleColumn = hasHeader ? handleColumnIndex : 0;

    if (dataRows.length === 0) {
      return NextResponse.json({ error: 'CSV has no streamer rows' }, { status: 400 });
    }

    const errors: string[] = [];
    const seen = new Set<string>();
    const normalized = dataRows.map((record, index) => {
      const row = index + (hasHeader ? 2 : 1);
      const handle = String(record[importHandleColumn] ?? '')
        .trim()
        .replace(/^@/, '')
        .toLowerCase();
      if (!handle) errors.push(`Row ${row}: missing handle`);
      if (!/^[a-z0-9_]{3,25}$/.test(handle)) {
        errors.push(`Row ${row}: invalid handle "${handle}"`);
      }
      if (seen.has(handle)) errors.push(`Row ${row}: duplicate handle "${handle}"`);
      seen.add(handle);
      return {
        handle,
        display_name: handle,
        active: true,
      };
    });

    if (!hasHeader && records.some((record) => record.length > 1)) {
      errors.unshift('Missing required column "handle" for multi-column CSV');
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Invalid CSV', errors }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const streamerIds: number[] = [];
      for (const row of normalized) {
        const streamer = await tx.streamer.upsert({
          where: { handle: row.handle },
          create: row,
          update: {
            display_name: row.display_name,
          },
        });
        streamerIds.push(streamer.id);
        await tx.streamerListEntry.upsert({
          where: {
            streamer_list_id_streamer_id: {
              streamer_list_id: listId,
              streamer_id: streamer.id,
            },
          },
          create: {
            streamer_list_id: listId,
            streamer_id: streamer.id,
            active: row.active,
          },
          update: {
            active: row.active,
          },
        });
      }

      if (mode === 'replace') {
        await tx.streamerListEntry.deleteMany({
          where: {
            streamer_list_id: listId,
            streamer_id: { notIn: streamerIds },
          },
        });
      }
    });

    return NextResponse.json({
      imported: normalized.length,
      mode,
      errors: [],
      total: dataRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import streamers';
    const status = message.includes('not found') || message.includes('No active') ? 400 : 500;
    console.error('Error importing streamers:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
