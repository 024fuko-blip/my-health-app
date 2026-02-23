/**
 * 服薬情報を AI プロンプト用のリッチテキストに変換する。
 * NDB 由来の薬効分類・後発品・薬価・PMDA リンクを含める。
 */

const PMDA_SEARCH_URL = 'https://www.pmda.go.jp/PmdaSearch/iyakuSearch/';

export interface MedicationForPrompt {
  name: string;
  ndb?: {
    drugCode: string;
    categoryName: string;
    price: number | null;
    isGeneric: boolean;
  };
}

function buildPmdaUrl(drugName: string): string {
  const params = new URLSearchParams({ keyword: drugName });
  return `${PMDA_SEARCH_URL}?${params.toString()}`;
}

/**
 * DB の current_medications 文字列をパースして MedicationForPrompt[] に変換する。
 * 互換: 旧形式（単一文字列）や { medications: [...] } の両方に対応。
 */
export function parseMedicationsFromSettings(raw: string | null | undefined): MedicationForPrompt[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { medications?: unknown }).medications)) {
      return ((parsed as { medications: MedicationForPrompt[] }).medications ?? []).map((m) => ({
        name: m.name ?? '',
        ndb: m.ndb,
      }));
    }
    if (typeof parsed === 'string') return [{ name: parsed }];
    if (parsed && typeof parsed === 'object' && 'name' in parsed) {
      return [{ name: String((parsed as { name: string }).name), ndb: (parsed as MedicationForPrompt).ndb }];
    }
    return [];
  } catch {
    return raw.trim() ? [{ name: raw.trim() }] : [];
  }
}

/**
 * 薬リストを AI プロンプト用の文字列に変換する。
 * 例: 「ロキソニン錠60mg（分類: 解熱鎮痛消炎剤 / 先発品 / 薬価: 10.1円）※ PMDA: https://...」
 */
export function formatMedicationsForPrompt(medications: MedicationForPrompt[]): string {
  if (!medications.length) return 'なし';

  return medications
    .map((m) => {
      const ndb = m.ndb;
      let line = m.name;
      if (ndb) {
        const parts: string[] = [];
        if (ndb.categoryName) parts.push(`分類: ${ndb.categoryName}`);
        parts.push(ndb.isGeneric ? '後発品' : '先発品');
        if (ndb.price != null) parts.push(`薬価: ${ndb.price}円`);
        if (parts.length) line += `（${parts.join(' / ')}）`;
      }
      line += ` ※ PMDA副作用情報: ${buildPmdaUrl(m.name)}`;
      return `- ${line}`;
    })
    .join('\n');
}

/**
 * DB の current_medications 文字列を AI プロンプト用のリッチテキストに変換する。
 */
export function formatMedicationsFromSettings(raw: string | null | undefined): string {
  const meds = parseMedicationsFromSettings(raw);
  return formatMedicationsForPrompt(meds);
}
