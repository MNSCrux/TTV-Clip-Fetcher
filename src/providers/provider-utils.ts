import { createHash } from 'node:crypto';

export function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

export function extractClipSlug(url: string) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const clipIndex = segments.indexOf('clip');
    if (clipIndex >= 0 && segments[clipIndex + 1]) {
      return segments[clipIndex + 1];
    }
    if (parsed.hostname === 'clips.twitch.tv' && segments[0]) {
      return segments[0];
    }
    return null;
  } catch {
    return null;
  }
}

export function parseViewCount(value?: string | null) {
  if (!value) return null;
  const cleaned = value.toLowerCase().replace(/views?/g, '').trim();
  const match = cleaned.match(/^([\d,.]+)\s*([km])?$/i);
  if (!match) return null;
  const numeric = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  const multiplier = match[2]?.toLowerCase() === 'k'
    ? 1000
    : match[2]?.toLowerCase() === 'm'
      ? 1000000
      : 1;
  return Math.round(numeric * multiplier);
}

export function parseDuration(value?: string | null) {
  if (!value) return null;
  const parts = value.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

export function generateExternalId(input: {
  url: string;
  title?: string;
  streamerHandle: string;
}) {
  return (
    extractClipSlug(input.url) ??
    createHash('sha256')
      .update(`${input.url}|${input.title ?? ''}|${input.streamerHandle}`)
      .digest('hex')
      .slice(0, 32)
  );
}

export function isRestrictedStreamer(input: {
  active: boolean;
  restriction_status: string;
}) {
  return (
    !input.active ||
    [
      'banned',
      'copyright_issue',
      'requested_not_to_use',
      'inactive',
    ].includes(input.restriction_status)
  );
}
