"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PREFECTURES, getNearestPrefecture } from "@/lib/prefectures";

export default function SettingsProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    profile_name: "",
    birth_date: "",
    gender: "unspecified",
    height: "",
    weight: "",
    normal_temperature: "",
    medical_history_text: "",
    prefecture: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [fullSettings, setFullSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/user-settings", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFullSettings(data);
        let medText = "";
        try {
          const parsed = JSON.parse(data.medical_history || "{}");
          medText = parsed.text || "";
        } catch {
          medText = typeof data.medical_history === "string" ? data.medical_history : "";
        }
        setProfile({
          profile_name: data.profile_name ?? "",
          birth_date: data.birth_date ?? "",
          gender: data.gender ?? "unspecified",
          height: data.height != null ? String(data.height) : "",
          weight: data.weight != null ? String(data.weight) : "",
          normal_temperature: data.normal_temperature != null ? String(data.normal_temperature) : "",
          medical_history_text: medText,
          prefecture: data.prefecture ?? "",
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    let medicalData: string;
    try {
      const existing = JSON.parse((fullSettings.medical_history as string) || "{}");
      medicalData = JSON.stringify({
        ...existing,
        text: profile.medical_history_text,
      });
    } catch {
      medicalData = JSON.stringify({ text: profile.medical_history_text });
    }
    const payload = {
      ...fullSettings,
      profile_name: profile.profile_name || null,
      birth_date: profile.birth_date || null,
      gender: profile.gender,
      height: profile.height ? profile.height : null,
      weight: profile.weight ? profile.weight : null,
      normal_temperature: profile.normal_temperature ? profile.normal_temperature : null,
      medical_history: medicalData,
      prefecture: profile.prefecture || null,
      latitude: profile.latitude,
      longitude: profile.longitude,
    };
    const res = await fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    setSaving(false);
    if (res.ok) {
      setFullSettings(payload);
      alert("保存しました");
    } else if (res.status === 401) {
      router.push("/login");
    } else {
      let msg = "保存に失敗しました";
      try {
        const err = await res.json();
        if (err?.detail) msg += ` (${err.detail})`;
      } catch {
        /* ignore */
      }
      alert(msg);
    }
  };

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border space-y-4">
        <h3 className="font-bold text-gray-700">👤 基本情報</h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">名前</label>
          <input
            type="text"
            value={profile.profile_name}
            onChange={(e) => setProfile((p) => ({ ...p, profile_name: e.target.value }))}
            className="w-full p-2 border rounded"
            placeholder="表示名"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">生年月日</label>
          <input
            type="date"
            value={profile.birth_date}
            onChange={(e) => setProfile((p) => ({ ...p, birth_date: e.target.value }))}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">性別（生理予測などに使用）</label>
          <select
            value={profile.gender}
            onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="unspecified">未設定</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">身長 (cm)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={profile.height}
              onChange={(e) => setProfile((p) => ({ ...p, height: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">体重 (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={profile.weight}
              onChange={(e) => setProfile((p) => ({ ...p, weight: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">平熱 (℃)</label>
            <input
              type="number"
              step="0.1"
              min="34"
              max="42"
              value={profile.normal_temperature}
              onChange={(e) => setProfile((p) => ({ ...p, normal_temperature: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="36.5"
            />
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <label className="block text-xs font-medium text-gray-500 mb-2">📍 現在地（おはよう相棒の天気・花粉に使用・任意）</label>
          <p className="text-xs text-gray-500 mb-2">
            拒否する場合は「設定しない」、または都道府県のみ手動で選べます。
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) {
                  alert("お使いのブラウザでは位置情報を取得できません。都道府県を手動で選択してください。");
                  return;
                }
                setLocationLoading(true);
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    const pref = getNearestPrefecture(lat, lon);
                    setProfile((p) => ({
                      ...p,
                      prefecture: pref ?? "",
                      latitude: lat,
                      longitude: lon,
                    }));
                    setLocationLoading(false);
                    if (pref) alert(`現在地を取得しました: ${pref}`);
                  },
                  (err) => {
                    setLocationLoading(false);
                    if (err.code === 1) {
                      alert("位置情報が拒否されました。都道府県を手動で選択してください。");
                    } else {
                      alert("位置情報の取得に失敗しました。都道府県を手動で選択してください。");
                    }
                  },
                  { enableHighAccuracy: false, timeout: 10000 }
                );
              }}
              disabled={locationLoading}
              className="px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
            >
              {locationLoading ? "取得中..." : "現在地を自動で取得"}
            </button>
            <button
              type="button"
              onClick={() =>
                setProfile((p) => ({
                  ...p,
                  prefecture: "",
                  latitude: null,
                  longitude: null,
                }))
              }
              className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-sm hover:bg-gray-100"
            >
              設定しない
            </button>
          </div>
          <select
            value={profile.prefecture}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                prefecture: e.target.value,
                latitude: null,
                longitude: null,
              }))
            }
            className="w-full p-2 border rounded text-sm"
          >
            <option value="">都道府県を手動で選択…</option>
            {PREFECTURES.map((pf) => (
              <option key={pf} value={pf}>
                {pf}
              </option>
            ))}
          </select>
          {profile.prefecture && (
            <p className="text-xs text-green-600 mt-1">設定中: {profile.prefecture}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">既往歴・持病</label>
          <textarea
            value={profile.medical_history_text}
            onChange={(e) => setProfile((p) => ({ ...p, medical_history_text: e.target.value }))}
            className="w-full p-2 border rounded h-24 text-sm"
            placeholder="例: 潰瘍性大腸炎、クローン病 など"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </div>
  );
}
