import { NextRequest, NextResponse } from 'next/server';

const realm = 'PoE Clip Checker';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  });
}

export function middleware(request: NextRequest) {
  const expectedUsername = process.env.SITE_USERNAME ?? 'friends';
  const expectedPassword = process.env.SITE_PASSWORD;

  if (!expectedPassword) {
    if (process.env.VERCEL_ENV === 'production') {
      return new NextResponse('Site password is not configured', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.next();
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const decoded = atob(authorization.slice('Basic '.length));
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';

    if (username !== expectedUsername || password !== expectedPassword) {
      return unauthorized();
    }
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
