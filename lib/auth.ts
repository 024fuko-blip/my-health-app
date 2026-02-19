import { getServerSession } from 'next-auth';
import { NextAuthOptions } from 'next-auth';
import { NextResponse } from 'next/server';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';
import { getServerEnv } from './env';

/**
 * NextAuth 設定（Google OAuth）。
 * AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_URL を lib/env 経由で使用。
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: getServerEnv().GOOGLE_CLIENT_ID,
      clientSecret: getServerEnv().GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? undefined;
        token.email = user.email ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id != null) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret: getServerEnv().AUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};

/** 既存 API との互換用。NextAuth セッションを { userId, email } 形式で返す */
export interface Session {
  userId: string;
  email: string;
}

export async function getSession(): Promise<Session | null> {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return null;
  const id = s.user.id;
  if (!id) return null;
  return { userId: id, email: s.user.email };
}

/** セッション取得。未認証の場合は 401 レスポンスを返す。API ルートで利用。 */
export async function requireSession(): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  return session;
}
