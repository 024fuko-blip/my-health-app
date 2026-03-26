"use client";

import { PREFECTURES } from "@/lib/prefectures";
import { useProfileSettings } from "./hooks/useProfileSettings";

export default function SettingsProfilePage() {
  const {
    loading,
    saving,
    locationLoading,
    profile,
    updateField,
    handleSave,
    handleGetLocation,
    clearLocation,
    selectPrefecture,
  } = useProfileSettings();

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border space-y-4">
        <h3 className="font-bold text-slate-800">👤 基本情報</h3>
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">名前</label>
          <input
            type="text"
            value={profile.profile_name}
            onChange={(e) => updateField("profile_name", e.target.value)}
            className="w-full p-2 border rounded text-slate-900"
            placeholder="表示名"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">生年月日</label>
          <input
            type="date"
            value={profile.birth_date}
            onChange={(e) => updateField("birth_date", e.target.value)}
            className="w-full p-2 border rounded text-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">性別（生理予測などに使用）</label>
          <select
            value={profile.gender}
            onChange={(e) => updateField("gender", e.target.value)}
            className="w-full p-2 border rounded text-slate-900"
          >
            <option value="unspecified">未設定</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">身長 (cm)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={profile.height}
              onChange={(e) => updateField("height", e.target.value)}
              className="w-full p-2 border rounded text-slate-900"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">体重 (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={profile.weight}
              onChange={(e) => updateField("weight", e.target.value)}
              className="w-full p-2 border rounded text-slate-900"
              placeholder="60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">平熱 (℃)</label>
            <input
              type="number"
              step="0.1"
              min="34"
              max="42"
              value={profile.normal_temperature}
              onChange={(e) => updateField("normal_temperature", e.target.value)}
              className="w-full p-2 border rounded text-slate-900"
              placeholder="36.5"
            />
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <label className="block text-sm font-medium text-slate-800 mb-2">📍 現在地（おはよう相棒の天気・花粉に使用・任意）</label>
          <p className="text-sm text-slate-700 mb-2">
            拒否する場合は「設定しない」、または都道府県のみ手動で選べます。
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locationLoading}
              className="px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
            >
              {locationLoading ? "取得中..." : "現在地を自動で取得"}
            </button>
            <button
              type="button"
              onClick={clearLocation}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium hover:bg-slate-100"
            >
              設定しない
            </button>
          </div>
          <select
            value={profile.prefecture}
            onChange={(e) => selectPrefecture(e.target.value)}
            className="w-full p-2 border rounded text-sm text-slate-900"
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
          <label className="block text-sm font-medium text-slate-800 mb-1">既往歴・持病</label>
          <textarea
            value={profile.medical_history_text}
            onChange={(e) => updateField("medical_history_text", e.target.value)}
            className="w-full p-2 border rounded h-24 text-sm text-slate-900"
            placeholder="例: 潰瘍性大腸炎、クローン病 など"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[var(--color-sage)] text-white p-3 font-bold disabled:opacity-50 hover:opacity-90"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </div>
  );
}
