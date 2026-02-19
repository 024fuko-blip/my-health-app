/**
 * Rich Menu 用の画像を生成（2500x1686 PNG）
 * 4エリア（今日の記録・ペット・分析・相談）をシンプルなデザインで作成
 */
import sharp from 'sharp';

const W = 2500;
const H = 1686;
const HW = Math.floor(W / 2);
const HH = Math.floor(H / 2);

const AREAS = [
  { x: 0, y: 0, w: HW, h: HH, label: '📝 今日の記録', bg: '#4A90D9' },
  { x: HW, y: 0, w: HW, h: HH, label: '🐱 ペット', bg: '#7B68EE' },
  { x: 0, y: HH, w: HW, h: HH, label: '📊 分析', bg: '#50C878' },
  { x: HW, y: HH, w: HW, h: HH, label: '💬 相談', bg: '#E8A87C' },
];

/** 各エリアのSVGを組み合わせて1枚のPNGを生成 */
export async function generateRichMenuImage(): Promise<Buffer> {
  const svgParts: string[] = [];

  for (const a of AREAS) {
    const fontSize = Math.min(80, Math.floor(a.w / 12));
    svgParts.push(`
      <rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${a.bg}"/>
      <rect x="${a.x + 2}" y="${a.y + 2}" width="${a.w - 4}" height="${a.h - 4}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
      <text x="${a.x + a.w / 2}" y="${a.y + a.h / 2}" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-weight="bold">${a.label}</text>
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
