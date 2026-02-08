"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsentPage() {
  const router = useRouter();
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canContinue = useMemo(
    () => scrolledToEnd && agreePrivacy && agreeTerms,
    [scrolledToEnd, agreePrivacy, agreeTerms]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 4) {
      setScrolledToEnd(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">同意画面</h1>
        <p className="text-sm text-gray-700">
          本サービスを利用するには、以下の内容に同意してください。
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs text-gray-500 mb-2">
            内容を最後までスクロールすると同意に進めます
          </div>
          <div
            ref={scrollRef}
            className="h-60 overflow-y-scroll bg-white p-3 text-xs text-gray-700 rounded border border-gray-100"
            onScroll={(e) => {
              const el = e.currentTarget;
              const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
              if (atEnd) setScrolledToEnd(true);
            }}
          >
            <p className="mb-2 font-bold">プライバシーポリシーの要点</p>
            <p className="mb-2">
              本アプリは、Google ログインを通じて以下の情報を取得します。
              取得項目は「メールアドレス」「氏名（設定されている場合）」「プロフィール画像（設定されている場合）」です。
            </p>
            <p className="mb-2">
              取得した情報は「ユーザー認証・本人確認」「アカウント作成・管理」
              「サービス提供・改善のための分析」に利用します。
            </p>
            <p className="mb-2">
              法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。
            </p>
            <p className="mb-2">
              取得した情報は、サービス提供に必要な期間に限り保存し、不要となった場合は適切に削除します。
            </p>
            <p className="mb-2">
              本ポリシーに関するお問い合わせは運営者までご連絡ください。必要に応じて内容を改定し、本ページで通知します。
            </p>
            <p>
              続行することで、プライバシーポリシーおよび利用規約に同意したものとみなされます。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-1"
              disabled={!scrolledToEnd}
            />
            <span>
              <a href="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</a>
              に同意します
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1"
              disabled={!scrolledToEnd}
            />
            <span>
              <a href="/terms" className="text-blue-600 hover:underline">利用規約</a>
              に同意します
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={() => router.push("/login")}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold disabled:bg-gray-300 disabled:text-gray-600"
        >
          同意してログインへ
        </button>
      </div>
    </div>
  );
}
