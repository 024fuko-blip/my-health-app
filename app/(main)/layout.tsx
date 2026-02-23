"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, PenSquare, Gamepad2, Settings } from 'lucide-react';
import FooterLink from '../components/FooterLink';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path ? "text-[var(--color-text)] font-bold" : "text-[var(--color-text-muted)]";

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-card)] pb-24 overflow-x-hidden">
      <main className="flex-1 w-full max-w-md mx-auto p-5 bg-white shadow-kirei-card min-h-screen min-w-0 overflow-x-hidden">
        {children}
      </main>
      <div className="w-full max-w-md mx-auto px-4 pb-24">
        <FooterLink />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] flex justify-around py-2 pb-6 z-50 shadow-kirei-nav">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 text-[10px] w-16 py-1 ${isActive('/dashboard')}`}>
          <BarChart3 className="w-6 h-6" strokeWidth={2} />
          <span>分析</span>
        </Link>

        <Link href="/calendar" className={`flex flex-col items-center gap-1 text-[10px] w-14 py-1 ${isActive('/calendar')}`}>
          <Calendar className="w-6 h-6" strokeWidth={2} />
          <span>履歴</span>
        </Link>

        <Link href="/record" className="flex flex-col items-center text-[10px] w-16 relative">
          <div className="bg-[var(--color-sage)] w-14 h-14 -mt-6 shadow-kirei-card border-4 border-white flex items-center justify-center transform transition active:scale-95">
            <PenSquare className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <span className={`mt-1 font-bold ${pathname === '/record' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>記録</span>
        </Link>

        <Link href="/game" className={`flex flex-col items-center gap-1 text-[10px] w-14 py-1 ${isActive('/game')}`}>
          <Gamepad2 className="w-6 h-6" strokeWidth={2} />
          <span>ゲーム</span>
        </Link>

        <Link href="/settings" className={`flex flex-col items-center gap-1 text-[10px] w-14 py-1 ${pathname.startsWith('/settings') ? 'text-[var(--color-text)] font-bold' : 'text-[var(--color-text-muted)]'}`}>
          <Settings className="w-6 h-6" strokeWidth={2} />
          <span>設定</span>
        </Link>
      </nav>
    </div>
  );
}