// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { getServerEnv } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  console.log('Creating new PrismaClient instance...');
  const nodeEnv = getServerEnv().NODE_ENV;
  return new PrismaClient({
    log: nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (getServerEnv().NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 本番環境でもグローバルにキャッシュ（Cloud Run対応）
globalForPrisma.prisma = prisma

export default prisma