import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
    pathname.startsWith('/api/game-stats') ||
    pathname.startsWith('/api/reminders') ||
    pathname.startsWith('/api/pet');

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