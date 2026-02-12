"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    medical_history_text: "",
  });
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
          medical_history_text: medText,
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
      medical_history: medicalData,
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
      alert("保存に失敗しました");
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
        <div className="grid grid-cols-2 gap-3">
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
