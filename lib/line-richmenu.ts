/**
 * LINE Rich Menu API。
 * リッチメニューの作成・画像アップロード・デフォルト設定。
 */

import { getLineConfig } from './line';

const RICHMENU_SIZE = { width: 2500, height: 1686 };

export interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number };
  action: {
    type: 'uri' | 'message' | 'postback';
    label: string;
    uri?: string;
    text?: string;
    data?: string;
  };
}

export function buildRichMenuObject(baseUrl: string): {
  size: typeof RICHMENU_SIZE;
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
} {
  const base = baseUrl.replace(/\/$/, '');
  const w = RICHMENU_SIZE.width;
  const h = RICHMENU_SIZE.height;
  const hw = Math.floor(w / 2);
  const hh = Math.floor(h / 2);

  return {
    size: RICHMENU_SIZE,
    selected: false,
    name: '健康相棒メニュー',
    chatBarText: 'タップして開く',
    areas: [
      {
        bounds: { x: 0, y: 0, width: hw, height: hh },
        action: { type: 'uri', label: '今日の記録', uri: `${base}/record` },
      },
      {
        bounds: { x: hw, y: 0, width: hw, height: hh },
        action: { type: 'uri', label: 'ペット', uri: `${base}/game/pet` },
      },
      {
        bounds: { x: 0, y: hh, width: hw, height: hh },
        action: { type: 'uri', label: '分析', uri: `${base}/dashboard` },
      },
      {
        bounds: { x: hw, y: hh, width: hw, height: hh },
        action: { type: 'message', label: '相談する', text: '相談したいことがあります' },
      },
    ],
  };
}

/** リッチメニューを作成し、IDを返す */
export async function createRichMenu(baseUrl: string): Promise<string> {
  const { accessToken } = getLineConfig();
  if (!accessToken) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が未設定です');

  const body = buildRichMenuObject(baseUrl);
  const res = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Rich Menu 作成失敗: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { richMenuId: string };
  return data.richMenuId;
}

/** リッチメニューに画像をアップロード */
export async function uploadRichMenuImage(richMenuId: string, imageBuffer: Buffer): Promise<void> {
  const { accessToken } = getLineConfig();
  if (!accessToken) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が未設定です');

  const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      Authorization: `Bearer ${accessToken}`,
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Rich Menu 画像アップロード失敗: ${res.status} ${err}`);
  }
}

/** 全ユーザーにデフォルトリッチメニューを設定 */
export async function setDefaultRichMenu(richMenuId: string): Promise<void> {
  const { accessToken } = getLineConfig();
  if (!accessToken) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が未設定です');

  const res = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Rich Menu デフォルト設定失敗: ${res.status} ${err}`);
  }
}
