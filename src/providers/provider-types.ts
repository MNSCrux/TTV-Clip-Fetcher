export type ClipProviderName =
  'twitch_api';

export type FetchClipsInput = {
  handle: string;
  displayName?: string;
  streamerId?: string | number;
  startedAt: Date;
  endedAt: Date;
};

export type NormalizedClip = {
  source: ClipProviderName;
  externalId: string;
  url: string;
  title?: string;
  streamerHandle: string;
  broadcasterName?: string;
  thumbnailUrl?: string;
  viewCount?: number | null;
  durationSeconds?: number | null;
  categoryName?: string | null;
  createdAt?: Date | null;
  scrapedAt: Date;
  raw?: unknown;
};

export type ClipSourceProvider = {
  name: ClipProviderName;
  displayName: string;
  enabled: boolean;
  fetchClipsForStreamer(input: FetchClipsInput): Promise<NormalizedClip[]>;
};
