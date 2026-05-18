import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function POST() {
  const result = await prisma.clip.deleteMany();
  return NextResponse.json({ deleted: result.count });
}
