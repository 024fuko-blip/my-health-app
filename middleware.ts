import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      });
      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
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