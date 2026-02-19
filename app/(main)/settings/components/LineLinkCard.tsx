"use client";

import { useState, useEffect } from "react";

/** スマホ判定（line:// で直接アプリ起動するために使用） */
function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

/** スマホでは line:// で直接アプリ起動（QRページを挟まない） */
function getAddFriendUrlForDevice(url: string): string {
  if (!url) return url;
  const m = url.match(/^https:\/\/line\.me\/R\/ti\/p\/(@[\w-]+)$/);
  if (isMobile() && m) return `line://ti/p/${m[1]}`;
  return url;
}

export default function LineLinkCard() {
  const [status, setStatus] = useState<"checking" | "linked" | "unlinked" | "requesting" | "unsupported">("checking");
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addFriendUrl, setAddFriendUrl] = useState<string | null>(null);
  const [richMenuLoading, setRichMenuLoading] = useState(false);
  const [richMenuMsg, setRichMenuMsg] = useState<string | null>(null);
  const isValidUrl = !!addFriendUrl;

  useEffect(() => {
    Promise.all([
      fetch("/api/line/status", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/line/add-friend-url", { credentials: "include" }).then((r) => r.json().catch(() => ({ url: null }))),
    ]).then(([statusData, urlData]) => {
      if (!statusData.enabled) setStatus("unsupported");
      else if (statusData.linked) setStatus("linked");
      else setStatus("unlinked");
      const url = urlData?.url?.trim();
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) setAddFriendUrl(url);
    }).catch(() => setStatus("unsupported"));
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
        // 友だち追加URLが有効なら、ボタン押下と同時にLINE友だち追加画面を開く（スマホなら line:// で直接アプリ起動）
        if (addFriendUrl) window.open(getAddFriendUrlForDevice(addFriendUrl), "_blank", "noopener");
      } else if (!res.ok) {
        setErrorMsg(data.error || `エラー (${res.status})`);
      }
    } catch (err) {
      setErrorMsg("通信エラー。ログインしているか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupRichMenu = async () => {
    setRichMenuLoading(true);
    setRichMenuMsg(null);
    try {
      const res = await fetch("/api/line/setup-richmenu", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setRichMenuMsg("✓ Rich Menu を設定しました");
      } else {
        setRichMenuMsg(data.error || `エラー (${res.status})`);
      }
    } catch {
      setRichMenuMsg("通信エラー");
    } finally {
      setRichMenuLoading(false);
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
      <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50/50 space-y-3">
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
        <div className="pt-2 border-t border-green-200 space-y-2">
          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs font-medium text-amber-800">⚠️ 「個別の問い合わせ受け付けておりません」と出る場合</p>
            <p className="text-xs text-amber-700 mt-0.5">LINE公式アカウント管理画面 → 応答設定 → 「応答メッセージ」をオフにしてください。</p>
          </div>
          <p className="text-xs text-gray-600">Rich Menu は友だち追加時に自動表示されます。表示されない場合のみ:</p>
          <button
            onClick={handleSetupRichMenu}
            disabled={richMenuLoading}
            className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            {richMenuLoading ? "設定中..." : "Rich Menu を再設定"}
          </button>
          {richMenuMsg && (
            <p className={`text-xs mt-1 ${richMenuMsg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
              {richMenuMsg}
            </p>
          )}
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
              <a href={getAddFriendUrlForDevice(addFriendUrl!)} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium inline-flex items-center gap-1">
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
    <div className="bg-white p-4 rounded-xl border hover:bg-gray-50 transition space-y-3">
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
      <div className="pt-2 border-t border-gray-100 space-y-2">
        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs font-medium text-amber-800">⚠️ 連携後「個別の問い合わせ受け付けておりません」と出る場合</p>
          <p className="text-xs text-amber-700 mt-0.5">LINE公式アカウント管理画面 → 応答設定 → 「応答メッセージ」をオフにしてください。</p>
        </div>
        <p className="text-xs text-gray-500">Rich Menu は友だち追加時に自動表示（表示されない場合のみ再設定可）</p>
        <button
          onClick={handleSetupRichMenu}
          disabled={richMenuLoading}
          className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
        >
          {richMenuLoading ? "設定中..." : "Rich Menu を再設定"}
        </button>
        {richMenuMsg && (
          <p className={`text-xs mt-1 ${richMenuMsg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
            {richMenuMsg}
          </p>
        )}
      </div>
      {isValidUrl && (
        <a
          href={getAddFriendUrlForDevice(addFriendUrl!)}
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
