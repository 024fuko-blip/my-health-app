"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ensureSession } from "@/lib/api-client";
import { signOut } from "next-auth/react";
import LineLinkCard from "./components/LineLinkCard";

export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      await ensureSession(router);
    };
    check();
  }, [router]);

  return (
    <div className="space-y-4 pt-2">
      <div className="bg-white p-4 rounded-xl border flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-700">使い方ガイド</h3>
          <p className="text-xs text-gray-700">モードやプロフィールの説明はこちら</p>
        </div>
        <Link
          href="/guide"
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          開く
        </Link>
      </div>

      <Link
        href="/settings/basic"
        className="block bg-white p-4 rounded-xl border hover:bg-gray-50 transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">🔧 基本設定</h3>
            <p className="text-xs text-gray-700 mt-0.5">
              AIの口調・健康管理モード（IBD・アルコール・メンタル・ボディメイク）
            </p>
          </div>
          <span className="text-gray-600">→</span>
        </div>
      </Link>

      <Link
        href="/settings/profile"
        className="block bg-white p-4 rounded-xl border hover:bg-gray-50 transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">👤 プロフィール</h3>
            <p className="text-xs text-gray-700 mt-0.5">
              名前・生年月日・性別・身長・体重・既往歴
            </p>
          </div>
          <span className="text-gray-600">→</span>
        </div>
      </Link>

      <Link
        href="/settings/health"
        className="block bg-white p-4 rounded-xl border hover:bg-gray-50 transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">🏥 健康管理</h3>
            <p className="text-xs text-gray-700 mt-0.5">
              生理周期・服薬中の薬
            </p>
          </div>
          <span className="text-gray-600">→</span>
        </div>
      </Link>

      <Link
        href="/reminders"
        className="block bg-white p-4 rounded-xl border hover:bg-gray-50 transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">⏰ リマインダー</h3>
            <p className="text-xs text-gray-700 mt-0.5">
              今日の服薬スケジュール・検診予定
            </p>
          </div>
          <span className="text-gray-600">→</span>
        </div>
      </Link>

      <Link
        href="/game/pet"
        className="block bg-white p-4 rounded-xl border hover:bg-gray-50 transition"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">🐾 マイペット</h3>
            <p className="text-xs text-gray-700 mt-0.5">
              相棒ペットの餌やり・着せ替え
            </p>
          </div>
          <span className="text-gray-600">→</span>
        </div>
      </Link>

      <LineLinkCard />

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full bg-gray-200 text-gray-700 p-3 rounded-lg text-sm font-medium hover:bg-gray-300"
      >
        ログアウト
      </button>
    </div>
  );
}
