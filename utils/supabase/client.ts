import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // ビルド中は環境変数がないので、ダミーのURLを入れてエラー回避！
  // (https://example.com は無効なURLではないのでエラーになりません)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.com";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

  return createBrowserClient(supabaseUrl, supabaseKey)
}