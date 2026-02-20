/**
 * Rich Menu 用の画像を生成（2500x1686 PNG）
 * 4エリア（記録・ペット・分析・相談）をシンプルに日本語表示
 */
import sharp from 'sharp';

const W = 2500;
const H = 1686;
const HW = Math.floor(W / 2);
const HH = Math.floor(H / 2);

const AREAS = [
  { x: 0, y: 0, w: HW, h: HH, label: '記録', emoji: '📝', bg: '#4A90D9' },
  { x: HW, y: 0, w: HW, h: HH, label: 'ペット', emoji: '🐾', bg: '#7B68EE' },
  { x: 0, y: HH, w: HW, h: HH, label: '分析', emoji: '📊', bg: '#50C878' },
  { x: HW, y: HH, w: HW, h: HH, label: '相談', emoji: '💬', bg: '#E8A87C' },
];

/** 各エリアのSVGを組み合わせて1枚のPNGを生成（日本語＋絵文字でわかりやすく） */
export async function generateRichMenuImage(): Promise<Buffer> {
  const svgParts: string[] = [];

  for (const a of AREAS) {
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    svgParts.push(`
      <rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${a.bg}"/>
      <text x="${cx}" y="${cy - 28}" font-size="180" fill="white" text-anchor="middle" dominant-baseline="central" font-family="IPAGothic, IPAゴシック, sans-serif">${a.emoji}</text>
      <text x="${cx}" y="${cy + 52}" font-size="120" fill="white" text-anchor="middle" dominant-baseline="central" font-family="IPAGothic, IPAゴシック, sans-serif">${a.label}</text>
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
