import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    healthLog: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/game-stats', () => ({
  updateStatsAfterLog: vi.fn(),
}));

import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

describe('GET /api/health-logs', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ userId: 'test-user', email: 'test@example.com' });
  });

  it('認証なしは401', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost/api/health-logs?date=2025-02-12');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('認証あり・date指定で200', async () => {
    vi.mocked(prisma.healthLog.findUnique).mockResolvedValue(null);
    const req = new Request('http://localhost/api/health-logs?date=2025-02-12');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });

  it('認証あり・startDate+endDateで200', async () => {
    vi.mocked(prisma.healthLog.findMany).mockResolvedValue([]);
    const req = new Request(
      'http://localhost/api/health-logs?startDate=2025-02-01&endDate=2025-02-28'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('POST /api/health-logs', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ userId: 'test-user', email: 'test@example.com' });
    vi.mocked(prisma.healthLog.upsert).mockResolvedValue({
      id: 'log-1',
      userId: 'test-user',
      date: '2025-02-12',
      memo: null,
      medicationTaken: false,
      generalMood: 3,
      mealDescription: null,
      periodStatus: null,
      aiComment: null,
      painLevel: null,
      stoolType: null,
      alcoholAmount: null,
      alcoholPercent: null,
      alcoholType: null,
      stressLevel: null,
      sleepQuality: null,
      spending: null,
      weight: null,
      bodyFat: null,
      calories: null,
      protein: null,
      steps: null,
      exerciseMinutes: null,
    });
  });

  it('認証あり・正当bodyで200', async () => {
    const body = { date: '2025-02-12', general_mood: 3 };
    const req = new Request('http://localhost/api/health-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('認証なしは401', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost/api/health-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2025-02-12' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
