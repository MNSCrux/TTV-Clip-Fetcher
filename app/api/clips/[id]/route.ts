import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const clip = await prisma.clip.update({
      where: { id },
      data: body,
      include: { streamer: true },
    });

    return NextResponse.json(clip);
  } catch (error) {
    console.error('Error updating clip:', error);
    return NextResponse.json(
      { error: 'Failed to update clip' },
      { status: 500 }
    );
  }
}
