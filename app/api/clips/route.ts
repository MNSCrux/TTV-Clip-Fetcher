import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PRIMARY_CATEGORIES = [
  'Path of Exile',
  'Path of Exile 2',
  'Last Epoch',
  'Diablo IV',
  'Just Chatting',
] as const;
const FILTER_CATEGORIES = [...PRIMARY_CATEGORIES, 'Tourist'] as const;

function getCategoryBucket(gameName: string | null) {
  return PRIMARY_CATEGORIES.includes(gameName as (typeof PRIMARY_CATEGORIES)[number])
    ? gameName
    : 'Tourist';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const game = searchParams.get('game');
    const streamer = searchParams.get('streamer');
    const search = searchParams.get('search');
    const minViews = Number(searchParams.get('minViews') || '0');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const fetchRunId = searchParams.get('fetchRunId');

    const where: any = {};

    if (fetchRunId) {
      const parsed = parseInt(fetchRunId, 10);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ error: 'Invalid fetchRunId' }, { status: 400 });
      }
      where.fetch_run_id = parsed;
    }

    if (status && status !== 'all') {
      if (status === 'selected') where.selected = true;
      else if (status === 'rejected') where.rejected = true;
      else if (status === 'unreviewed') {
        where.selected = false;
        where.rejected = false;
      }
    }

    if (game && game !== 'all') {
      if (game === 'Tourist') {
        where.OR = [
          { game_name: null },
          { game_name: { notIn: [...PRIMARY_CATEGORIES] } },
        ];
      } else if (PRIMARY_CATEGORIES.includes(game as (typeof PRIMARY_CATEGORIES)[number])) {
        where.game_name = game;
      }
    }

    if (streamer) {
      where.broadcaster_name = {
        contains: streamer,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }
    if (minViews > 0) {
      where.view_count = { gte: minViews };
    }

    let orderBy: any = { created_at: 'desc' };
    if (sort === 'oldest') orderBy = { created_at: 'asc' };
    else if (sort === 'most_viewed') orderBy = { view_count: 'desc' };
    else if (sort === 'longest') orderBy = { duration: 'desc' };
    else if (sort === 'shortest') orderBy = { duration: 'asc' };
    else if (sort === 'streamer_a_z') orderBy = { broadcaster_name: 'asc' };

    const [clips, total] = await Promise.all([
      prisma.clip.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          streamer: true,
        },
      }),
      prisma.clip.count({ where }),
    ]);

    return NextResponse.json({
      clips: clips.map((clip) => ({
        ...clip,
        category_bucket: getCategoryBucket(clip.game_name),
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      categories: FILTER_CATEGORIES,
    });
  } catch (error) {
    console.error('Error fetching clips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clips' },
      { status: 500 }
    );
  }
}
