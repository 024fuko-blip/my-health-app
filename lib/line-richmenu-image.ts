/**
 * Rich Menu 用の画像を生成（2500x1686 PNG）
 * 4エリア（記録・今日の体調予想・ペット・分析）を色分け・ポップなデザインで表示
 */
import sharp from 'sharp';

const W = 2500;
const H = 1686;
const HW = Math.floor(W / 2);
const HH = Math.floor(H / 2);

const AREAS = [
  { x: 0, y: 0, w: HW, h: HH, label: '📝 記録', bg: '#22c55e', text: '#ffffff' },
  { x: HW, y: 0, w: HW, h: HH, label: '🔮 今日の体調予想', bg: '#3b82f6', text: '#ffffff' },
  { x: 0, y: HH, w: HW, h: HH, label: '🐾 ペット', bg: '#f97316', text: '#ffffff' },
  { x: HW, y: HH, w: HW, h: HH, label: '📊 分析', bg: '#8b5cf6', text: '#ffffff' },
];

/** 各エリアを色付き・ポップなデザインで生成 */
export async function generateRichMenuImage(): Promise<Buffer> {
  const svgParts: string[] = [];

  for (const a of AREAS) {
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    svgParts.push(`
      <rect x="${a.x + 8}" y="${a.y + 8}" width="${a.w - 16}" height="${a.h - 16}" rx="24" fill="${a.bg}" stroke="rgba(255,255,255,0.5)" stroke-width="4"/>
      <text x="${cx}" y="${cy}" font-size="88" fill="${a.text}" text-anchor="middle" dominant-baseline="central" font-family="IPAGothic, IPAゴシック, Hiragino Sans, sans-serif" font-weight="bold">${a.label}</text>
    `);
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      ${svgParts.join('')}
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return buffer;
}
