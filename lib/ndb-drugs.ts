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

const drugs: NdbDrug[] = ndbDrugsJson as NdbDrug[];

/** 部分一致で医薬品を検索。limit 件まで返す。 */
export function searchDrugs(query: string, limit = 20): NdbDrug[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: NdbDrug[] = [];

  for (const drug of drugs) {
    if (drug.name.toLowerCase().includes(q)) {
      results.push(drug);
      if (results.length >= limit) break;
    }
  }

  return results;
}
