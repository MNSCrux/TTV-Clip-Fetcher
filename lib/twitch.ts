import 'server-only';

import type { TwitchPaginatedResponse, TwitchUser } from './types';

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCredentials() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Twitch credentials not configured');
  }

  return { clientId, clientSecret };
}

export async function getTwitchAppAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Twitch auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    // Renew one minute early instead of waiting for exact expiry.
    expiresAt: Date.now() + Math.max(data.expires_in - 60, 0) * 1000,
  };

  return cachedToken.token;
}

export async function getTwitchUsersByLogin(logins: string[]) {
  if (logins.length === 0) return [];
  if (logins.length > 100) {
    throw new Error('Twitch Get Users supports at most 100 logins per request');
  }

  const { clientId } = getCredentials();
  const token = await getTwitchAppAccessToken();
  const params = new URLSearchParams();

  for (const login of logins) {
    params.append('login', login);
  }

  const response = await fetch(`https://api.twitch.tv/helix/users?${params}`, {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Twitch Get Users failed: ${response.status}`);
  }

  const data = (await response.json()) as TwitchPaginatedResponse<TwitchUser>;
  return data.data ?? [];
}

export function getTwitchClientId() {
  return getCredentials().clientId;
}
