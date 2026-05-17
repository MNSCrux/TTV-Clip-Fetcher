import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  parseOptionalListId,
  resolveStreamerListId,
} from '@/lib/streamer-lists';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const listId = await resolveStreamerListId(
      body.listId ?? parseOptionalListId(searchParams.get('listId'))
    );

    if ('active' in body) {
      const entry = await prisma.streamerListEntry.update({
        where: {
          streamer_list_id_streamer_id: {
            streamer_list_id: listId,
            streamer_id: id,
          },
        },
        data: { active: Boolean(body.active) },
        include: { streamer: true },
      });
      return NextResponse.json({
        ...entry.streamer,
        active: entry.active,
      });
    }

    const streamer = await prisma.streamer.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(streamer);
  } catch (error) {
    console.error('Error updating streamer:', error);
    return NextResponse.json(
      { error: 'Failed to update streamer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    const listId = await resolveStreamerListId(
      parseOptionalListId(request.nextUrl.searchParams.get('listId'))
    );

    await prisma.streamerListEntry.delete({
      where: {
        streamer_list_id_streamer_id: {
          streamer_list_id: listId,
          streamer_id: id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing streamer from list:', error);
    return NextResponse.json(
      { error: 'Failed to remove streamer from list' },
      { status: 500 }
    );
  }
}
