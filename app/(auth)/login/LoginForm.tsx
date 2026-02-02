"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          const redirect = searchParams.get("redirect") || "/dashboard";
          router.push(redirect);
        }
      })
      .catch(() => {});
  }, [router, searchParams]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("処理中...");

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        const redirect = searchParams.get("redirect") || "/dashboard";
        router.push(redirect);
        router.refresh();
      } else {
        setMessage("エラー: " + (data.error || "認証に失敗しました"));
      }
    } catch {
      setMessage("エラー: ネットワークエラーが発生しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
          IBD Log App
        </h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700"
          >
            {isLogin ? "ログイン" : "新規登録"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-sm text-blue-500 underline text-center block"
        >
          {isLogin ? "アカウント作成はこちら" : "ログインはこちら"}
        </button>
        {message && (
          <p className="mt-4 text-red-500 text-center text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
