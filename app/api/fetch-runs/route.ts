import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  parseOptionalListId,
  resolveStreamerListId,
} from '@/lib/streamer-lists';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const listIdParam = request.nextUrl.searchParams.get('listId');
    const listId = await resolveStreamerListId(parseOptionalListId(listIdParam));

    const runs = await prisma.fetchRun.findMany({
      where: { streamer_list_id: listId },
      orderBy: { started_at: 'desc' },
      select: {
        id: true,
        started_at: true,
        total_clips_found: true,
        failed_streamers: true,
        status: true,
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch runs';
    const status = message.includes('not found') || message.includes('No active') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
