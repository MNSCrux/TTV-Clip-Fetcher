import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET() {
  try {
    const lists = await prisma.streamerList.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(lists);
  } catch (error) {
    console.error('Error fetching streamer lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streamer lists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const list = await prisma.streamerList.create({
      data: { name, is_active: false },
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error creating streamer list:', error);
    return NextResponse.json(
      { error: 'Failed to create streamer list' },
      { status: 500 }
    );
  }
}
