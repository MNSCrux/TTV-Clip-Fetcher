import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET() {
  const lists = await prisma.clipList.findMany({
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(lists);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const list = await prisma.clipList.create({
    data: {
      name: body.name || `Clip list ${new Date().toISOString()}`,
      links_text: body.linksText,
      clip_count: body.clipCount,
    },
  });
  return NextResponse.json(list);
}
