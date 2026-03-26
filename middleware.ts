import { NextResponse, type NextRequest } from 'next/server';

const CANONICAL_HOST = 'my-health-apps-81772171421.asia-northeast2.run.app';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  if (host && host !== CANONICAL_HOST && host.endsWith('.run.app')) {
    const canonical = new URL(request.url);
    canonical.host = CANONICAL_HOST;
    canonical.port = '';
    return NextResponse.redirect(canonical, 301);
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRequired =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/record') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/game') ||
    pathname.startsWith('/reminders') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/api/health-logs') ||
    pathname.startsWith('/api/user-settings') ||
    pathname.startsWith('/api/report') ||
    pathname.startsWith('/api/advice') ||
    pathname.startsWith('/api/analyze-meal') ||
    pathname.startsWith('/api/game-stats') ||
    pathname.startsWith('/api/reminders') ||
    pathname.startsWith('/api/insights') ||
    pathname.startsWith('/api/correlation-stats') ||
    pathname.startsWith('/api/drugs') ||
    pathname.startsWith('/api/pet') ||
    pathname.startsWith('/api/push-subscribe') ||
    (pathname.startsWith('/api/line') && !pathname.startsWith('/api/line/webhook'));

  if (isAuthRequired) {
    const sessionCookie =
      request.cookies.get('__Secure-next-auth.session-token') ??
      request.cookies.get('__Host-next-auth.session-token') ??
      request.cookies.get('next-auth.session-token');

    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({
    request: { headers: request.headers },
  });
}

export const config = {
  matcher: [
    /*
     * 以下のパスを除外してマッチさせる:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (画像フォルダがあれば)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};