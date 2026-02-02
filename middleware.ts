import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuthRequired =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/record') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/api/health-logs') ||
    pathname.startsWith('/api/user-settings') ||
    pathname.startsWith('/api/report') ||
    pathname.startsWith('/api/advice');

  if (isAuthRequired) {
    try {
      const session = await getSession();
      if (!session) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      const loginUrl = new URL('/login', request.url);
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