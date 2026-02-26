"use client";

import { useState, useEffect } from "react";
import { apiFetch, apiPost } from "@/lib/api-client";

export default function PushNotifyButton() {
  const [status, setStatus] = useState<"idle" | "checking" | "prompt" | "subscribed" | "unsupported" | "error">("checking");
  const [loading, setLoading] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const openNotificationSettings = () => {
    const fallback = typeof window !== "undefined" ? window.location.origin + "/reminders" : "";
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      // Chrome の通知設定を開く（サイト別は「サイトの設定」一覧から）
      const intent = `intent://#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
      window.location.href = intent;
    } else if (isIOS) {
      // iOS は Web から設定を開けないため、ガイド画面へ
      window.open("/guide?from=reminders#notification", "_blank");
    } else {
      // PC: サイト設定やガイドへ
      window.open("/guide?from=reminders#notification", "_blank");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    apiFetch("/api/push-subscribe")
      .then((r) => r.json())
      .then((data) => {
        if (!data.enabled) setStatus("unsupported");
        else if (data.subscribed) setStatus("subscribed");
        else setStatus("prompt");
      })
      .catch(() => setStatus("error"));
  }, []);

  const handleEnable = async () => {
    if (status !== "prompt" || loading) return;
    setLoading(true);
    setErrorDetail(null);
    try {
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.register("/sw.js");
      }
      const reg = await navigator.serviceWorker.ready;
      const subRes = await apiFetch("/api/push-subscribe");
      const subData = await subRes.json();
      const vapid_public_key = subData.vapid_public_key;
      if (!vapid_public_key) {
        setStatus("unsupported");
        return;
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid_public_key) as BufferSource,
      });
      const result = await apiPost<Record<string, unknown>>("/api/push-subscribe", {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
        },
      });
      if (result.ok) {
        setStatus("subscribed");
      } else {
        setErrorDetail(result.error || `サーバーエラー (${result.status})`);
        setStatus("error");
      }
    } catch (err) {
      const e = err as Error & { name?: string };
      if (e.name === "NotAllowedError") {
        setErrorDetail("通知を許可してください。ブラウザの設定で「ブロック」になっていないか確認してください。");
      } else if (String(e.message || "").includes("registration") || String(e.message || "").includes("service worker")) {
        setErrorDetail("Service Worker の登録に失敗しました。ページをリロードしてからもう一度お試しください。");
      } else {
        setErrorDetail(e.message || "不明なエラーが発生しました。");
      }
      console.error("Push subscribe error:", err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") return null;
  if (status === "unsupported") {
    return (
      <p className="text-xs text-gray-500 mt-2">
        通知機能はお使いの環境では利用できません。
      </p>
    );
  }
  if (status === "subscribed") {
    return (
      <p className="text-xs text-green-600 mt-2 font-medium">
        ✅ スマホに通知が届くように設定されています
      </p>
    );
  }
  if (status === "error") {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-red-600">
          通知の設定に失敗しました。
        </p>
        {errorDetail && (
          <p className="text-xs text-gray-600">{errorDetail}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openNotificationSettings}
            className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            ⚙️ 通知設定を開く
          </button>
          <button
            type="button"
            onClick={() => { setStatus("prompt"); setErrorDetail(null); }}
            className="text-sm px-3 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300"
          >
            もう一度試す
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="text-sm px-3 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "設定中..." : "📱 スマホに通知を届ける"}
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
