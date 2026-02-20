/** プロンプトに埋め込むユーザー入力をサニタイズ（インジェクション対策） */
const MAX_LEN = 500;

export function sanitizeForPrompt(input: string): string {
  return input.slice(0, MAX_LEN).replace(/\n/g, ' ').replace(/["「」]/g, ' ');
}
