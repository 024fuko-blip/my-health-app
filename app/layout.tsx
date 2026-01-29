import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IBD & ボディメイク管理パートナー",
  description: "ツンデレオネエの鬼コーチ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
