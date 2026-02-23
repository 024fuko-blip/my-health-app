/**
 * 週次・月次・年次インサイト用 AI プロンプトテンプレート。
 * getCharaPrompt(aiPersonality, 'advice') の結果を charaSetting として受け取り組み立てる。
 */

import { MEDICATION_AI_CAUTION_RULE } from '@/lib/medication-prompt';

export interface UserContext {
  medicalHistory: string;
  currentMedications: string;
  modeIbd: boolean;
  modeDiet: boolean;
  modeAlcohol: boolean;
  modeMental: boolean;
}

export function buildWeeklySystemPrompt(charaSetting: string, userContext: UserContext): string {
  return `
${charaSetting}

## タスク
渡された「過去7日分の記録」を**因果関係を突き止める探偵**のように分析し、300文字以内の週次要約を作りなさい。

## 最優先で見る因果の例
1. **生理周期とメンタル・体調**: period_status（生理前/生理中）と体調・ストレス・便の相関を指摘しなさい。
2. **食事と翌日以降の症状**: meal_description と翌日の pain_level・stool_type の関係を指摘しなさい。
3. **アルコールと睡眠・体調**: 飲酒量と翌日の sleep_quality・general_mood の相関を言いなさい。

## 出力ルール
- 因果がはっきりしたパターンは具体的に「〇〇の日は△△になってる」と断じなさい。
- データが少ない部分は「もう少し記録を続けないとわからないわ」と正直に言いなさい。
- 300文字以内で、読みやすく改行を入れなさい。

## ユーザー情報
- 既往歴: ${userContext.medicalHistory}
- 薬: ${userContext.currentMedications}
- 関心: IBD=${userContext.modeIbd} / ボディメイク=${userContext.modeDiet} / アルコール=${userContext.modeAlcohol} / メンタル=${userContext.modeMental}

${MEDICATION_AI_CAUTION_RULE}
`;
}

export function buildMonthlySystemPrompt(charaSetting: string, userContext: UserContext): string {
  return `
${charaSetting}

## タスク
渡された「今月の週次要約（4〜5件）」だけを読み、**週をまたいだ傾向**を分析し、300文字以内の月次総括を作りなさい。生の日次記録は読まないこと。

## 見るべき傾向の例
1. **月後半に食生活が乱れがち**などの曜日・週ごとのパターン
2. **生理周期と体調の相関**が月を通じてどう現れているか
3. **飲酒・ストレス・睡眠**の週ごとの推移
4. 悪い習慣の繰り返しや、改善の兆し

## 出力ルール
- 週次要約を総合し、月全体の傾向・気づきを述べなさい。
- 因果が不明な部分は正直に言いなさい。
- 300文字以内で、読みやすく改行を入れなさい。

## ユーザー情報
- 既往歴: ${userContext.medicalHistory}
- 薬: ${userContext.currentMedications}
- 関心: IBD=${userContext.modeIbd} / ボディメイク=${userContext.modeDiet} / アルコール=${userContext.modeAlcohol} / メンタル=${userContext.modeMental}

${MEDICATION_AI_CAUTION_RULE}
`;
}

export function buildYearlySystemPrompt(charaSetting: string, userContext: UserContext): string {
  return `
${charaSetting}

## タスク
渡された「12ヶ月分の月次要約」だけを読み、**季節性バイオリズム・年の傾向**を分析し、300文字以内の年次総括を作りなさい。週次・日次の生データは読まないこと。

## 見るべき傾向の例
1. **春に体調崩しやすい**など季節ごとのパターン
2. **冬は運動不足**などの季節と習慣の相関
3. 月次要約をつなげた長期的な体調の波
4. 去年1年を通じての改善点・続けたい点

## 出力ルール
- 月次要約を総合し、年の傾向・バイオリズムを述べなさい。
- 「去年の春も同じように体調崩してた」のように具体的に言いなさい。
- 300文字以内で、読みやすく改行を入れなさい。

## ユーザー情報
- 既往歴: ${userContext.medicalHistory}
- 薬: ${userContext.currentMedications}
- 関心: IBD=${userContext.modeIbd} / ボディメイク=${userContext.modeDiet} / アルコール=${userContext.modeAlcohol} / メンタル=${userContext.modeMental}

${MEDICATION_AI_CAUTION_RULE}
`;
}
