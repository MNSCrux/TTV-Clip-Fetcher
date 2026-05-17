import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTwitchAppAccessToken } from '@/lib/twitch';
import { providers, getDefaultProviderName } from '@/src/providers';

const prisma = new PrismaClient();

const settingKeys = [
  'DEFAULT_CLIP_PROVIDER',
] as const;

const defaults = {
  DEFAULT_CLIP_PROVIDER: getDefaultProviderName(),
};

async function readSettings() {
  const stored = await prisma.appSetting.findMany({
    where: { key: { in: [...settingKeys] } },
  });
  const storedMap = new Map(stored.map((setting) => [setting.key, setting.value]));
  return Object.fromEntries(
    settingKeys.map((key) => [
      key,
      storedMap.get(key) ?? process.env[key] ?? defaults[key],
    ])
  );
}

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const configured = !!(clientId && clientSecret);
  let authStatus = 'unconfigured';
  let authError = null;
  if (configured) {
    try {
      await getTwitchAppAccessToken();
      authStatus = 'authenticated';
    } catch (error) {
      authStatus = 'error';
      authError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  const settings = await readSettings();
  return NextResponse.json({
    configured,
    authStatus,
    authError,
    clientIdSet: !!clientId,
    clientSecretSet: !!clientSecret,
    settings,
    providers: Object.values(providers).map((provider) => ({
      name: provider.name,
      displayName: provider.displayName,
      enabled: provider.enabled,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const next = {
    DEFAULT_CLIP_PROVIDER: String(
      body.DEFAULT_CLIP_PROVIDER ?? defaults.DEFAULT_CLIP_PROVIDER
    ),
  };
  await Promise.all(
    Object.entries(next).map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
  return NextResponse.json({ settings: next });
}
