import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import prisma from './prisma';
import bcrypt from 'bcryptjs';
import { getServerEnv } from './env';

/**
 * NextAuth は未使用。認証は JWT + bcrypt（このファイル）で実装。
 * AUTH_SECRET 等は getServerEnv() で実行時（Runtime）にのみ解決。ビルド時は参照しない。
 * Prisma は lib/prisma のシングルトンを使用（ビルドプロセスを妨げない）。
 */
/** 実行時のみ評価。ビルド時は呼ばれない。シークレットのデフォルト値は設定しない。 */
function getEncryptionKey(): Uint8Array {
  const env = getServerEnv();
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export interface Session {
  userId: string;
  email: string;
}

export async function encrypt(payload: Session) {
  const key = getEncryptionKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(session: string): Promise<Session | null> {
  try {
    const key = getEncryptionKey();
    const { payload } = await jwtVerify(session, key);
    return payload as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}

export async function createSession(userId: string, email: string) {
  const session = await encrypt({ userId, email });
  const cookieStore = await cookies();
  const env = getServerEnv();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser(email: string, password: string) {
  const hashedPassword = await hashPassword(password);
  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
}
