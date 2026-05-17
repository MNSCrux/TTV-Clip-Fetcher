import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    const body = await request.json();

    if (body.is_active === true) {
      await prisma.$transaction([
        prisma.streamerList.updateMany({
          data: { is_active: false },
        }),
        prisma.streamerList.update({
          where: { id },
          data: { is_active: true },
        }),
      ]);
    } else {
      await prisma.streamerList.update({
        where: { id },
        data: body,
      });
    }

    const list = await prisma.streamerList.findUnique({ where: { id } });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error updating streamer list:', error);
    return NextResponse.json(
      { error: 'Failed to update streamer list' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid list id' }, { status: 400 });
    }

    const lists = await prisma.streamerList.findMany({
      orderBy: { id: 'asc' },
    });
    const list = lists.find((item) => item.id === id);
    if (!list) {
      return NextResponse.json({ error: 'Streamer list not found' }, { status: 404 });
    }
    if (lists.length === 1) {
      return NextResponse.json({ error: 'Cannot delete the only streamer list' }, { status: 400 });
    }

    const nextActive = lists.find((item) => item.id !== id);
    await prisma.$transaction(async (tx) => {
      await tx.streamerList.delete({ where: { id } });
      if (list.is_active && nextActive) {
        await tx.streamerList.update({
          where: { id: nextActive.id },
          data: { is_active: true },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting streamer list:', error);
    return NextResponse.json(
      { error: 'Failed to delete streamer list' },
      { status: 500 }
    );
  }
}
