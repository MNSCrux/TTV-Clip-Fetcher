import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getDefaultProviderName,
  getProvider,
} from '@/src/providers';
import type { ClipProviderName, NormalizedClip } from '@/src/providers';
import { resolveStreamerListId } from '@/lib/streamer-lists';
import { resolveMissingTwitchUserIds } from '@/lib/twitch-user-resolution';

export const maxDuration = 300;

type FetchClipsRequest = {
  startedAt?: string;
  endedAt?: string;
  provider?: ClipProviderName;
  listId?: number | string;
};

type ClipStreamer = {
  id: number;
  handle: string;
  twitch_user_id: string | null;
  display_name: string;
};

async function getSetting(key: string, fallback: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return setting?.value ?? process.env[key] ?? fallback;
}

async function insertClips(
  clips: NormalizedClip[],
  streamer: ClipStreamer,
  fetchRunId: number
) {
  if (clips.length === 0) return 0;
  const result = await prisma.clip.createMany({
    data: clips.map((clip) => ({
      id: `${clip.source}:${clip.externalId}:${fetchRunId}`,
      source: clip.source,
      external_id: clip.externalId,
      url: clip.url,
      broadcaster_id: clip.broadcasterId ?? streamer.twitch_user_id ?? streamer.handle,
      broadcaster_name: clip.broadcasterName ?? streamer.display_name,
      title: clip.title ?? clip.url,
      streamer_handle: clip.streamerHandle,
      view_count: clip.viewCount ?? 0,
      created_at: clip.createdAt ?? clip.scrapedAt,
      thumbnail_url: clip.thumbnailUrl,
      duration: clip.durationSeconds,
      game_name: clip.categoryName,
      scraped_at: clip.scrapedAt,
      raw_json: clip.raw ? JSON.stringify(clip.raw) : null,
      streamer_id: streamer.id,
      fetch_run_id: fetchRunId,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const runNext = () => {
    if (active >= concurrency) return;
    const next = queue.shift();
    if (!next) return;
    active++;
    next();
  };
  return async <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            runNext();
          });
      });
      runNext();
    });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FetchClipsRequest;
    const listId = await resolveStreamerListId(body.listId);
    const endedAt = new Date(body.endedAt || new Date());
    const startedAt = new Date(
      body.startedAt || new Date(endedAt.getTime() - 24 * 60 * 60 * 1000)
    );
    const providerName = body.provider ?? (await getSetting(
      'DEFAULT_CLIP_PROVIDER',
      getDefaultProviderName()
    )) as ClipProviderName;
    const provider = getProvider(providerName);
    if (!provider?.enabled) {
      return Response.json(
        { error: `Provider ${providerName} is disabled or unconfigured` },
        { status: 400 }
      );
    }

    const entries = await prisma.streamerListEntry.findMany({
      where: {
        streamer_list_id: listId,
        active: true,
      },
      include: { streamer: true },
    });
    const listedStreamers = entries.map((entry) => entry.streamer);

    const concurrency = 5;
    const dbWrite = createLimiter(1);
    const resolution = await resolveMissingTwitchUserIds(prisma, listedStreamers);
    const streamers = resolution.resolved;
    const totalStreamers = listedStreamers.length;

    const fetchRun = await prisma.fetchRun.create({
      data: {
        status: 'running',
        provider: providerName,
        started_at: startedAt,
        ended_at: endedAt,
        total_streamers: totalStreamers,
        streamer_list_id: listId,
      },
    });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let completed = 0;
        let failed = 0;
        let totalClipsFound = 0;
        let activeTasks = 0;
        const failedHandles: string[] = [];
        const failedStreamerErrors: Array<{ handle: string; error: string }> = [];
        const noClipHandles: string[] = [];
        const send = (data: object) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
        send({
          type: 'start',
          fetchRunId: fetchRun.id,
          totalStreamers,
          provider: providerName,
          concurrency,
        });

        const limit = createLimiter(concurrency);

        for (const { streamer, message } of resolution.errors) {
          failed++;
          failedHandles.push(streamer.handle);
          failedStreamerErrors.push({ handle: streamer.handle, error: message });
          await prisma.streamerFetchError.create({
            data: {
              fetch_run_id: fetchRun.id,
              handle: streamer.handle,
              twitch_user_id: streamer.twitch_user_id,
              error_message: message,
              streamer_id: streamer.id,
            },
          });
        }

        const tasks = streamers.map((streamer) =>
            limit(async () => {
              activeTasks++;
              try {
                const clips = await provider.fetchClipsForStreamer({
                        handle: streamer.handle,
                        displayName: streamer.display_name,
                        streamerId: streamer.twitch_user_id ?? undefined,
                        startedAt,
                        endedAt,
                      });
                const inserted = await dbWrite(() => insertClips(clips, streamer, fetchRun.id));
                totalClipsFound += inserted;
                if (clips.length === 0) {
                  noClipHandles.push(streamer.handle);
                }
                completed++;
              } catch (error) {
                failed++;
                failedHandles.push(streamer.handle);
                const errorMessage =
                  error instanceof Error ? error.message : 'Unknown error';
                failedStreamerErrors.push({
                  handle: streamer.handle,
                  error: errorMessage,
                });
                await prisma.streamerFetchError.create({
                  data: {
                    fetch_run_id: fetchRun.id,
                    handle: streamer.handle,
                    twitch_user_id: streamer.twitch_user_id,
                    error_message: errorMessage,
                    streamer_id: streamer.id,
                  },
                });
              } finally {
                activeTasks--;
                send({
                  type: 'progress',
                  completed,
                  failed,
                  processed: completed + failed,
                  totalStreamers,
                  totalClipsFound,
                  currentHandle: streamer.handle,
                  activeTasks,
                });
              }
            })
          );
        await Promise.allSettled(tasks);

        const status = failed > 0 ? 'completed_with_errors' : 'completed';
        await prisma.fetchRun.update({
          where: { id: fetchRun.id },
          data: {
            status,
            completed_streamers: completed,
            failed_streamers: failed,
            total_clips_found: totalClipsFound,
            finished_at: new Date(),
          },
        });
        send({
          type: 'complete',
          success: true,
          status,
          fetchRunId: fetchRun.id,
          totalStreamers,
          completed,
          failed,
          totalClipsFound,
          failedHandles,
          failedStreamerErrors,
          noClipHandles,
        });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clips' },
      { status: 500 }
    );
  }
}
