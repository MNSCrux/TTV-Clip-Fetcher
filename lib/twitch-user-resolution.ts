import { PrismaClient, Streamer } from '@prisma/client';
import { getTwitchUsersByLogin } from './twitch';

export type TwitchUserResolution = {
  resolved: Streamer[];
  unresolved: Streamer[];
  errors: Array<{ streamer: Streamer; message: string }>;
};

export async function resolveMissingTwitchUserIds(
  prisma: PrismaClient,
  streamers: Streamer[]
): Promise<TwitchUserResolution> {
  const missing = streamers.filter((streamer) => !streamer.twitch_user_id);
  if (missing.length === 0) {
    return { resolved: streamers, unresolved: [], errors: [] };
  }

  const missingByHandle = new Map(
    missing.map((streamer) => [streamer.handle.toLowerCase(), streamer])
  );
  const errors: Array<{ streamer: Streamer; message: string }> = [];

  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    const handles = batch.map((streamer) => streamer.handle.toLowerCase());

    try {
      const users = await getTwitchUsersByLogin(handles);
      const foundHandles = new Set(users.map((user) => user.login.toLowerCase()));

      await Promise.all(
        users.map((user) => {
          const streamer = missingByHandle.get(user.login.toLowerCase());
          if (!streamer) return Promise.resolve();
          return prisma.streamer.update({
            where: { id: streamer.id },
            data: {
              twitch_user_id: user.id,
              twitch_display_name: user.display_name,
              profile_image_url: user.profile_image_url,
              last_resolved_at: new Date(),
            },
          });
        })
      );

      for (const streamer of batch) {
        if (!foundHandles.has(streamer.handle.toLowerCase())) {
          errors.push({ streamer, message: 'Twitch user not found' });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      for (const streamer of batch) {
        errors.push({
          streamer,
          message: `Twitch user lookup failed: ${message}`,
        });
      }
    }
  }

  const refreshed = await prisma.streamer.findMany({
    where: { id: { in: streamers.map((streamer) => streamer.id) } },
  });

  return {
    resolved: refreshed.filter((streamer) => streamer.twitch_user_id),
    unresolved: refreshed.filter((streamer) => !streamer.twitch_user_id),
    errors,
  };
}
