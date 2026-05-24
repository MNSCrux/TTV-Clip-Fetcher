import { getTwitchAppAccessToken, getTwitchClientId } from '@/lib/twitch';
import type { TwitchPaginatedResponse, TwitchClip } from '@/lib/types';
import { normalizeHandle } from './provider-utils';
import type {
  ClipSourceProvider,
  FetchClipsInput,
  NormalizedClip,
} from './provider-types';

async function fetchGameNames(gameIds: string[], token: string, clientId: string) {
  const names = new Map<string, string>();
  const uniqueIds = [...new Set(gameIds.filter(Boolean))];
  for (let i = 0; i < uniqueIds.length; i += 100) {
    const params = new URLSearchParams();
    for (const id of uniqueIds.slice(i, i + 100)) params.append('id', id);
    const response = await fetch(`https://api.twitch.tv/helix/games?${params}`, {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json();
      for (const game of data.data ?? []) {
        names.set(game.id, game.name);
      }
    }
  }
  return names;
}

function normalizeClips(rawClips: TwitchClip[], gameNames: Map<string, string>) {
  return rawClips.map((clip) => ({
    source: 'twitch_api' as const,
    externalId: clip.id,
    url: clip.url,
    title: clip.title,
    streamerHandle: normalizeHandle(clip.broadcaster_name),
    broadcasterId: clip.broadcaster_id,
    broadcasterName: clip.broadcaster_name,
    thumbnailUrl: clip.thumbnail_url,
    viewCount: clip.view_count,
    durationSeconds: clip.duration,
    categoryName: gameNames.get(clip.game_id) ?? null,
    createdAt: new Date(clip.created_at),
    scrapedAt: new Date(),
    raw: clip,
  }));
}

export const twitchApiProvider: ClipSourceProvider = {
  name: 'twitch_api',
  displayName: 'Twitch API',
  get enabled() {
    return !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
  },
  async fetchClipsForStreamer(input: FetchClipsInput): Promise<NormalizedClip[]> {
    if (!input.streamerId) {
      throw new Error('Twitch API provider requires streamerId');
    }

    const token = await getTwitchAppAccessToken();
    const clientId = getTwitchClientId();
    const rawClips: TwitchClip[] = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({
        broadcaster_id: String(input.streamerId),
        started_at: input.startedAt.toISOString(),
        ended_at: input.endedAt.toISOString(),
        first: '100',
      });
      if (cursor) params.set('after', cursor);

      const response = await fetch(`https://api.twitch.tv/helix/clips?${params}`, {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Twitch Get Clips failed: ${response.status}`);
      }

      const data = (await response.json()) as TwitchPaginatedResponse<TwitchClip>;
      rawClips.push(...(data.data ?? []));
      cursor = data.pagination?.cursor;
    } while (cursor);

    const gameNames = await fetchGameNames(
      rawClips.map((clip) => clip.game_id),
      token,
      clientId
    );

    return normalizeClips(rawClips, gameNames).map((clip) => ({
      ...clip,
      streamerHandle: normalizeHandle(input.handle),
    }));
  },
};
