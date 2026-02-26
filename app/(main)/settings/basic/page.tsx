"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureSession, handleUnauthorized, apiFetch, apiPut } from "@/lib/api-client";
import { PATH } from "@/lib/constants";

export default function SettingsBasicPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    mode_ibd: true,
    mode_alcohol: false,
    mode_mental: false,
    mode_diet: false,
    ai_personality: "tsundere" as "tsundere" | "kibishime" | "amayama" | "naruse",
  });
  const [fullSettings, setFullSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const session = await ensureSession(router);
      if (!session) return;
      const res = await apiFetch("/api/user-settings");
      if (res.status === 401) {
        handleUnauthorized(router);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFullSettings(data);
        setSettings({
          mode_ibd: data.mode_ibd ?? true,
          mode_alcohol: data.mode_alcohol ?? false,
          mode_mental: data.mode_mental ?? false,
          mode_diet: data.mode_diet ?? false,
          ai_personality:
            ["tsundere", "kibishime", "amayama", "naruse"].includes(data.ai_personality)
              ? data.ai_personality
              : "tsundere",
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, [router]);

  const toggleMode = (key: "mode_ibd" | "mode_alcohol" | "mode_mental" | "mode_diet") => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...fullSettings,
      mode_ibd: settings.mode_ibd,
      mode_alcohol: settings.mode_alcohol,
      mode_mental: settings.mode_mental,
      mode_diet: settings.mode_diet,
      ai_personality: settings.ai_personality,
    };
    const result = await apiPut<Record<string, unknown>>("/api/user-settings", payload);
    setSaving(false);
    if (result.ok) {
      setFullSettings(payload);
      alert("保存しました");
    } else if (result.status === 401) {
      router.replace(PATH.LOGIN);
    } else {
      alert("保存に失敗しました" + (result.error ? ` (${result.error})` : ""));
    }
  };

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border space-y-4">
        <h3 className="font-bold text-slate-700">使用モード</h3>
        <p className="text-xs text-slate-700">記録・分析で使う項目を選びます</p>
        <div className="space-y-2">
          <label className="flex justify-between items-center py-2">
            <span>💊 IBD管理</span>
            <input type="checkbox" checked={settings.mode_ibd} onChange={() => toggleMode("mode_ibd")} className="w-6 h-6" />
          </label>
          <label className="flex justify-between items-center py-2">
            <span>🍺 アルコール管理</span>
            <input type="checkbox" checked={settings.mode_alcohol} onChange={() => toggleMode("mode_alcohol")} className="w-6 h-6" />
          </label>
          <label className="flex justify-between items-center py-2">
            <span>🌿 メンタルケア</span>
            <input type="checkbox" checked={settings.mode_mental} onChange={() => toggleMode("mode_mental")} className="w-6 h-6" />
          </label>
          <label className="flex justify-between items-center py-2">
            <span>💪 ボディメイク</span>
            <input type="checkbox" checked={settings.mode_diet} onChange={() => toggleMode("mode_diet")} className="w-6 h-6 accent-purple-600" />
          </label>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h3 className="font-bold text-slate-800">AIモード</h3>
        <p className="text-xs text-slate-700">相棒の話し方を選べます</p>
        <div className="space-y-2">
          {[
            { value: "tsundere" as const, label: "ツンデレ" },
            { value: "kibishime" as const, label: "厳しめ" },
            { value: "amayama" as const, label: "あまあま" },
            { value: "naruse" as const, label: "成瀬（勘違いイケメン風）" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, ai_personality: value }))}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg border-2 text-left transition ${
                settings.ai_personality === value
                  ? "border-slate-400 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="font-medium">{label}</span>
              {settings.ai_personality === value && <span className="text-xs text-slate-700">✓ 使用中</span>}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[var(--color-sage)] text-white p-3 font-bold disabled:opacity-50 hover:opacity-90 transition"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </div>
  );
}
