import { twitchApiProvider } from './twitch-api-provider';
import type { ClipProviderName } from './provider-types';

export const providers = {
  twitch_api: twitchApiProvider,
};

export function getDefaultProviderName(): ClipProviderName {
  const configured = process.env.DEFAULT_CLIP_PROVIDER as ClipProviderName | undefined;
  return configured && providers[configured]
    ? configured
    : 'twitch_api';
}

export function getProvider(name = getDefaultProviderName()) {
  return providers[name];
}

export * from './provider-types';
export * from './provider-utils';
