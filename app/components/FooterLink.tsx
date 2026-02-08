export default function FooterLink() {
  return (
    <div className="mt-4 text-center text-[10px] text-gray-400">
      <a href="/privacy" className="hover:underline">
        プライバシーポリシー
      </a>
      <span className="mx-2">|</span>
      <a href="/terms" className="hover:underline">
        利用規約
      </a>
    </div>
  );
}
