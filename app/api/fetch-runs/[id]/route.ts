import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid fetch run id' }, { status: 400 });
    }

    const run = await prisma.fetchRun.findUnique({
      where: { id },
      include: {
        errors: {
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            handle: true,
            error_message: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Fetch run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error('Error fetching fetch run:', error);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid fetch run id' }, { status: 400 });
    }

    await prisma.fetchRun.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fetch run:', error);
    return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 });
  }
}
