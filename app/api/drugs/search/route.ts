/**
 * NDB 医薬品検索 API
 * GET /api/drugs/search?q=ロキソ&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSession } from '@/lib/api-utils';
import { searchDrugs } from '@/lib/ndb-drugs';

const MAX_QUERY_LEN = 100;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export async function GET(req: NextRequest) {
  return withSession(async () => {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LEN);
    const rawLimit = searchParams.get('limit');
    const limit = Math.min(
      Math.max(MIN_LIMIT, parseInt(String(rawLimit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    );

    const results = searchDrugs(q, limit);
    return NextResponse.json({ drugs: results });
  });
}
