"use client";

import { useState, useEffect } from "react";

export default function PushNotifyButton() {
  const [status, setStatus] = useState<"idle" | "checking" | "prompt" | "subscribed" | "unsupported" | "error">("checking");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    fetch("/api/push-subscribe", { credentials: "include" })
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
    try {
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.register("/sw.js");
      }
      const reg = await navigator.serviceWorker.ready;
      const subRes = await fetch("/api/push-subscribe", { credentials: "include" });
      const { vapid_public_key } = await subRes.json();
      if (!vapid_public_key) {
        setStatus("unsupported");
        return;
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid_public_key),
      });
      const res = await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
          },
        }),
      });
      if (res.ok) {
        setStatus("subscribed");
      } else {
        setStatus("error");
      }
    } catch (err) {
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
      <p className="text-xs text-red-600 mt-2">
        通知の設定に失敗しました。ブラウザの設定で通知を許可してください。
      </p>
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
