"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          aria-label="アプリに戻る"
        >
          ←
        </Link>
        <h2 className="text-xl font-bold flex-1">⚙️ 設定</h2>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/settings"
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
            pathname === "/settings"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          メニュー
        </Link>
        <Link
          href="/settings/basic"
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
            isActive("/settings/basic")
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          基本設定
        </Link>
        <Link
          href="/settings/profile"
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
            isActive("/settings/profile")
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          プロフィール
        </Link>
        <Link
          href="/settings/health"
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
            isActive("/settings/health")
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          健康管理
        </Link>
        <Link
          href="/reminders"
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
            pathname === "/reminders"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          リマインダー
        </Link>
        <Link
          href="/game/pet"
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
            pathname === "/game/pet"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          マイペット
        </Link>
      </nav>

      {children}
    </div>
  );
}
