"use client";

import { useState, useEffect } from "react";

export default function LineLinkCard() {
  const [status, setStatus] = useState<"checking" | "linked" | "unlinked" | "requesting" | "unsupported">("checking");
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/line/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.enabled) setStatus("unsupported");
        else if (d.linked) setStatus("linked");
        else setStatus("unlinked");
      })
      .catch(() => setStatus("unsupported"));
  }, []);

  const handleLinkStart = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/link-request", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (data.linked) {
        setStatus("linked");
      } else if (data.code) {
        setCode(data.code);
        setStatus("requesting");
      } else if (!res.ok) {
        setErrorMsg(data.error || `エラー (${res.status})`);
      }
    } catch (err) {
      setErrorMsg("通信エラー。ログインしているか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("LINE連携を解除しますか？")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/line/unlink", { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setStatus("unlinked");
        setCode(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const addFriendUrl = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || null;
  const isValidUrl = addFriendUrl && (addFriendUrl.startsWith("http://") || addFriendUrl.startsWith("https://"));

  if (status === "checking") {
    return (
      <div className="bg-white p-4 rounded-xl border opacity-60">
        <h3 className="font-bold text-gray-800">📱 LINE連携</h3>
        <p className="text-xs text-gray-500 mt-0.5">読み込み中...</p>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="bg-white p-4 rounded-xl border border-gray-200 bg-gray-50/50">
        <h3 className="font-bold text-gray-800">📱 LINE連携</h3>
        <p className="text-xs text-gray-500 mt-0.5">服薬リマインド・チャットから記録（希望者のみ）</p>
        <p className="text-xs text-amber-600 mt-2">※ 現在利用できません（管理者が環境変数を設定すると使えます）</p>
      </div>
    );
  }

  if (status === "linked") {
    return (
      <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">📱 LINE連携</h3>
            <p className="text-xs text-gray-600 mt-0.5">服薬リマインド・チャットから記録が可能</p>
          </div>
          <button
            onClick={handleUnlink}
            disabled={loading}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            解除
          </button>
        </div>
      </div>
    );
  }

  if (status === "requesting" && code) {
    return (
      <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50/50">
        <h3 className="font-bold text-gray-800 mb-2">📱 LINE連携</h3>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>
            {isValidUrl ? (
              <a href={addFriendUrl!} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium inline-flex items-center gap-1">
                公式アカウントを友だち追加 →
              </a>
            ) : (
              <span>LINE公式アカウントを友だち追加（QRコードはLINE Developersで確認）</span>
            )}
          </li>
          <li>
            チャットで <strong className="bg-yellow-100 px-1 rounded">連携 {code}</strong> と送信
          </li>
        </ol>
        <p className="text-xs text-gray-500 mt-2">コードは10分間有効です</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl border hover:bg-gray-50 transition">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">📱 LINE連携</h3>
          <p className="text-xs text-gray-500 mt-0.5">服薬リマインド・チャットから記録（希望者のみ）</p>
        </div>
        <button
          onClick={handleLinkStart}
          disabled={loading}
          className="text-sm font-bold text-green-600 hover:underline disabled:opacity-50"
        >
          {loading ? "処理中..." : "連携する"}
        </button>
      </div>
      {isValidUrl && (
        <a
          href={addFriendUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-green-600 hover:underline"
        >
          LINE公式アカウントを友だち追加 →
        </a>
      )}
      {errorMsg && (
        <p className="text-xs text-red-600 mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
