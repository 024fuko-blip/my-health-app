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
    <div className="space-y-4 pb-20 overflow-x-hidden min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition"
          aria-label="アプリに戻る"
        >
          ←
        </Link>
        <h2 className="text-xl font-bold flex-1 text-[var(--color-text)]">設定</h2>
      </div>

      <nav className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1 min-w-0 w-full scrollbar-hide">
        <Link
          href="/settings"
          className={`shrink-0 px-4 py-2 text-sm font-medium transition ${
            pathname === "/settings"
              ? "bg-[var(--color-sage)] text-white"
              : "bg-[var(--color-card)] text-slate-800 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
          }`}
        >
          メニュー
        </Link>
        <Link
          href="/settings/basic"
          className={`shrink-0 px-4 py-2 text-sm font-medium transition ${
            isActive("/settings/basic")
              ? "bg-[var(--color-sage)] text-white"
              : "bg-[var(--color-card)] text-slate-800 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
          }`}
        >
          基本設定
        </Link>
        <Link
          href="/settings/profile"
          className={`shrink-0 px-4 py-2 text-sm font-medium transition ${
            isActive("/settings/profile")
              ? "bg-[var(--color-sage)] text-white"
              : "bg-[var(--color-card)] text-slate-800 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
          }`}
        >
          プロフィール
        </Link>
        <Link
          href="/settings/health"
          className={`shrink-0 px-4 py-2 text-sm font-medium transition ${
            isActive("/settings/health")
              ? "bg-[var(--color-sage)] text-white"
              : "bg-[var(--color-card)] text-slate-800 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
          }`}
        >
          健康管理
        </Link>
        <Link
          href="/reminders"
          className={`shrink-0 px-4 py-2 text-sm font-medium transition ${
            pathname === "/reminders"
              ? "bg-[var(--color-sage)] text-white"
              : "bg-[var(--color-card)] text-slate-800 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
          }`}
        >
          リマインダー
        </Link>
        <Link
          href="/game/pet"
          className={`shrink-0 px-4 py-2 text-sm font-medium transition ${
            pathname === "/game/pet"
              ? "bg-[var(--color-sage)] text-white"
              : "bg-[var(--color-card)] text-slate-800 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
          }`}
        >
          マイペット
        </Link>
      </nav>

      {children}
    </div>
  );
}
