/**
 * NDB 医薬品検索 API
 * GET /api/drugs/search?q=ロキソ&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSession } from '@/lib/api-utils';
import { searchDrugs } from '@/lib/ndb-drugs';

export async function GET(req: NextRequest) {
  return withSession(async () => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50);

    const results = searchDrugs(q, limit);
    return NextResponse.json({ drugs: results });
  });
}
