export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
      <div className="pb-4">
        <div className="w-full max-w-md mx-auto px-4">
          {/* FooterLink is client component; keep link simple here */}
          <div className="mt-4 text-center text-[10px] text-gray-400">
            <a href="/privacy" className="hover:underline">
              プライバシーポリシー
            </a>
            <span className="mx-2">|</span>
            <a href="/terms" className="hover:underline">
              利用規約
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
