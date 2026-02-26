"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FooterLink from "../components/FooterLink";

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
    <div className="min-h-screen bg-slate-50/80 px-4 flex flex-col">
      <div className="flex-1 flex items-center justify-center py-6 sm:py-10">
        <div
          className="w-full max-w-xl mx-auto rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100"
          style={{ maxWidth: "min(100%, 28rem)" }}
        >
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4">
            利用開始のご同意
          </h1>
          <p className="text-base text-slate-700 leading-relaxed mb-6">
            このアプリを使うには、プライバシーポリシーと利用規約への同意が必要です。
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-6">
            <p className="text-sm text-slate-600 mb-3">
              以下を最後まで読むと、同意に進めます
            </p>
            <div
              ref={scrollRef}
              className="max-h-52 overflow-y-auto bg-white p-4 rounded-lg border border-slate-100 text-slate-700"
              style={{
                lineHeight: 1.75,
                letterSpacing: "0.02em",
              }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
                if (atEnd) setScrolledToEnd(true);
              }}
            >
              <p className="font-semibold text-slate-800 mb-3">プライバシーポリシーの要点</p>
              <p className="mb-3 text-[15px]">
                本アプリは、Google ログインを通じて以下の情報を取得します。
              </p>
              <p className="mb-3 text-[15px] pl-3 border-l-2 border-slate-200">
                メールアドレス、氏名（設定されている場合）、プロフィール画像（設定されている場合）
              </p>
              <p className="mb-3 text-[15px]">
                これらの情報は、本人確認・アカウント管理・サービス改善に利用します。法令に基づく場合を除き、第三者へ提供することはありません。
              </p>
              <p className="mb-3 text-[15px]">
                サービス提供に必要な期間のみ保存し、不要になったら削除します。
              </p>
              <p className="text-[15px]">
                続行することで、プライバシーポリシーおよび利用規約に同意したものとみなされます。
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                disabled={!scrolledToEnd}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-[var(--color-sage)] focus:ring-[var(--color-sage)]"
              />
              <span className="text-[15px] text-slate-700 leading-relaxed">
                <a href="/privacy" className="text-slate-800 font-medium underline underline-offset-2 hover:text-[var(--color-sage)]">
                  プライバシーポリシー
                </a>
                に同意します
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={!scrolledToEnd}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-[var(--color-sage)] focus:ring-[var(--color-sage)]"
              />
              <span className="text-[15px] text-slate-700 leading-relaxed">
                <a href="/terms" className="text-slate-800 font-medium underline underline-offset-2 hover:text-[var(--color-sage)]">
                  利用規約
                </a>
                に同意します
              </span>
            </label>
          </div>

          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.setItem("consentAccepted", "true");
              }
              router.push("/guide?from=consent");
            }}
            className="w-full bg-[var(--color-sage)] text-white py-3.5 px-4 rounded-xl font-bold text-base disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
          >
            同意して使い方へ
          </button>
        </div>
      </div>
      <footer className="w-full max-w-xl mx-auto py-6 pb-8">
        <FooterLink />
      </footer>
    </div>
  );
}
