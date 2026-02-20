/**
 * Rich Menu 用の画像を生成（2500x1686 PNG）
 * 4エリア（記録・今日の体調予想・ペット・分析）を日本語でシンプルに表示
 */
import sharp from 'sharp';

const W = 2500;
const H = 1686;
const HW = Math.floor(W / 2);
const HH = Math.floor(H / 2);

const AREAS = [
  { x: 0, y: 0, w: HW, h: HH, label: '記録' },
  { x: HW, y: 0, w: HW, h: HH, label: '今日の体調予想' },
  { x: 0, y: HH, w: HW, h: HH, label: 'ペット' },
  { x: HW, y: HH, w: HW, h: HH, label: '分析' },
];

/** 各エリアを白背景・枠線・黒文字でシンプルに生成 */
export async function generateRichMenuImage(): Promise<Buffer> {
  const svgParts: string[] = [];

  for (const a of AREAS) {
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    svgParts.push(`
      <rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
      <text x="${cx}" y="${cy}" font-size="100" fill="#212529" text-anchor="middle" dominant-baseline="central" font-family="IPAGothic, IPAゴシック, sans-serif">${a.label}</text>
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
