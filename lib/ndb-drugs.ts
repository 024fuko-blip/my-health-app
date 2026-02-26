/**
 * NDB 医薬品データの読み込みと検索。
 * lib/data/ndb-drugs.json をインポートしてメモリキャッシュし、部分一致で検索する。
 */

import ndbDrugsJson from './data/ndb-drugs.json';

export interface NdbDrug {
  name: string;
  code: string;
  categoryCode: string;
  categoryName: string;
  price: number | null;
  isGeneric: boolean;
}

interface NdbDrugIndexed extends NdbDrug {
  _lower: string;
}

const drugs: NdbDrugIndexed[] = (ndbDrugsJson as NdbDrug[]).map((d) => ({
  ...d,
  _lower: d.name.toLowerCase(),
}));

const MAX_QUERY_LEN = 100;

/** 部分一致で医薬品を検索。limit 件まで返す。 */
export function searchDrugs(query: string, limit = 20): NdbDrug[] {
  const q = query.trim().toLowerCase().slice(0, MAX_QUERY_LEN);
  if (!q) return [];

  const results: NdbDrug[] = [];

  for (const drug of drugs) {
    if (drug._lower.includes(q)) {
      results.push(drug);
      if (results.length >= limit) break;
    }
  }

  return results;
}
