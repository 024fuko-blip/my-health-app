/**
 * OpenAI API の共有クライアント。
 * 全 API ルート・insights で重複していた初期化+completion 抽出ロジックを集約。
 */

import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { getServerEnv } from '@/lib/env';

/** OPENAI_API_KEY 未設定を表すエラー。withSession で自動的に 503 に変換される */
export class OpenAIKeyMissingError extends Error {
  constructor() {
    super('OPENAI_API_KEY が未設定です');
    this.name = 'OpenAIKeyMissingError';
  }
}

export interface ChatCompletionParams {
  systemPrompt: string;
  userContent: string | ChatCompletionContentPart[];
  model?: string;
  temperature?: number;
  fallbackMessage?: string;
}

/** OpenAI クライアントを取得。API キー未設定時は OpenAIKeyMissingError を throw */
export function getOpenAIClient(): OpenAI {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new OpenAIKeyMissingError();
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

/** API キーが設定済みかを事前チェック（throw しない版） */
export function isOpenAIAvailable(): boolean {
  return !!getServerEnv().OPENAI_API_KEY;
}

export async function chatCompletion(params: ChatCompletionParams): Promise<string> {
  const {
    systemPrompt,
    userContent,
    model = 'gpt-4o-mini',
    temperature = 0.7,
    fallbackMessage = '応答を生成できませんでした。',
  } = params;

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature,
  });

  return completion.choices[0]?.message?.content?.trim() ?? fallbackMessage;
}
