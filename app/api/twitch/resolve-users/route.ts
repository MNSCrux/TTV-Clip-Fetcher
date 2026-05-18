import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveMissingTwitchUserIds } from '@/lib/twitch-user-resolution';


export async function POST() {
  try {
    const unresolved = await prisma.streamer.findMany({
      where: { twitch_user_id: null },
    });

    if (unresolved.length === 0) {
      return NextResponse.json({ resolved: 0, failed: 0, results: [] });
    }

    const resolution = await resolveMissingTwitchUserIds(prisma, unresolved);
    const results = resolution.resolved.map((streamer) => ({
      handle: streamer.handle,
      twitch_user_id: streamer.twitch_user_id,
      success: true,
    }));

    return NextResponse.json({
      resolved: results.length,
      failed: resolution.unresolved.length,
      failed_handles: resolution.unresolved.map((streamer) => streamer.handle),
      errors: resolution.errors.map(({ streamer, message }) => ({
        handle: streamer.handle,
        error: message,
      })),
      results,
    });
  } catch (error) {
    console.error('Error resolving Twitch users:', error);
    return NextResponse.json(
      { error: 'Failed to resolve users' },
      { status: 500 }
    );
  }
}
