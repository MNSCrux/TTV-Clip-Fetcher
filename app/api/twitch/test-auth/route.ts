import { NextResponse } from 'next/server';
import { getTwitchAppAccessToken } from '@/lib/twitch';

export async function POST() {
  try {
    await getTwitchAppAccessToken();
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Twitch auth failed',
      },
      { status: 400 }
    );
  }
}
