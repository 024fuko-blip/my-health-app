"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // アクティブなタブの色を変える関数
  const isActive = (path: string) => pathname === path ? "text-blue-600 font-bold" : "text-gray-400";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      <main className="flex-1 w-full max-w-md mx-auto p-4 bg-white shadow-sm min-h-screen">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 pb-6 z-50 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
        
        {/* 分析 (Dashboard) */}
        <Link href="/dashboard" className={`flex flex-col items-center text-[10px] w-16 py-1 ${isActive('/dashboard')}`}>
          <span className="text-2xl mb-0.5">📊</span>
          <span>分析</span>
        </Link>

        {/* カレンダー (Calendar) ★追加 */}
        <Link href="/calendar" className={`flex flex-col items-center text-[10px] w-16 py-1 ${isActive('/calendar')}`}>
          <span className="text-2xl mb-0.5">📅</span>
          <span>履歴</span>
        </Link>

        {/* 記録 (Record) - 真ん中で強調 */}
        <Link href="/record" className="flex flex-col items-center text-[10px] w-16 relative">
          <div className="bg-blue-600 rounded-full w-14 h-14 -mt-6 shadow-lg border-4 border-white flex items-center justify-center transform transition active:scale-95">
             <span className="text-2xl text-white">✏️</span>
          </div>
          <span className={`mt-1 font-bold ${pathname === '/record' ? 'text-blue-600' : 'text-gray-400'}`}>記録</span>
        </Link>

        {/* 設定 (Settings) */}
        <Link href="/settings" className={`flex flex-col items-center text-[10px] w-16 py-1 ${isActive('/settings')}`}>
          <span className="text-2xl mb-0.5">⚙️</span>
          <span>設定</span>
        </Link>

      </nav>
    </div>
  );
}