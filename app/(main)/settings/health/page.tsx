"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MEDICATION_TIMINGS = ["朝", "昼", "晩", "眠前"];
const DEFAULT_REMINDER_TIMES: Record<string, string> = {
  朝: "08:00",
  昼: "12:00",
  晩: "18:00",
  眠前: "22:00",
};

interface Medication {
  id: number;
  name: string;
  timings: string[];
}

export default function SettingsHealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullSettings, setFullSettings] = useState<Record<string, unknown>>({});
  const [gender, setGender] = useState("unspecified");
  const [periodCycle, setPeriodCycle] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [newMedName, setNewMedName] = useState("");
  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>(DEFAULT_REMINDER_TIMES);

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
        setGender(data.gender ?? "unspecified");

        let pCycle = 28,
          pDuration = 5,
          lastPeriod = "";
        try {
          const historyData = JSON.parse(data.medical_history || "{}");
          pCycle = historyData.periodCycle ?? 28;
          pDuration = historyData.periodDuration ?? 5;
          lastPeriod = historyData.lastPeriodDate ?? "";
        } catch {
          // ignore
        }
        setPeriodCycle(pCycle);
        setPeriodDuration(pDuration);
        setLastPeriodDate(lastPeriod);

        let meds: Medication[] = [];
        try {
          const medData = JSON.parse(data.current_medications || "{}");
          if (medData.medications && Array.isArray(medData.medications)) {
            meds = medData.medications;
          } else if (medData.name) {
            meds = [{ id: Date.now(), name: medData.name, timings: medData.timings || [] }];
          }
        } catch {
          if (data.current_medications) {
            meds = [{ id: Date.now(), name: String(data.current_medications), timings: [] }];
          }
        }
        setMedications(meds);

        let times = { ...DEFAULT_REMINDER_TIMES };
        try {
          if (data.medication_reminder_times) {
            const parsed = JSON.parse(data.medication_reminder_times as string) as Record<string, string>;
            times = { ...DEFAULT_REMINDER_TIMES, ...parsed };
          }
        } catch {
          // ignore
        }
        setReminderTimes(times);
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
        text: existing.text ?? "",
        periodCycle,
        periodDuration,
        lastPeriodDate: lastPeriodDate || undefined,
      });
    } catch {
      medicalData = JSON.stringify({
        text: "",
        periodCycle,
        periodDuration,
        lastPeriodDate: lastPeriodDate || undefined,
      });
    }
    const medicationData = JSON.stringify({ medications });
    const payload = {
      ...fullSettings,
      gender,
      medical_history: medicalData,
      current_medications: medicationData,
      medication_reminder_times: JSON.stringify(reminderTimes),
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
      {gender === "female" && (
        <div className="bg-pink-50 p-4 rounded-xl border border-pink-200 space-y-4">
          <h3 className="font-bold text-pink-800">🩸 生理周期</h3>
          <div>
            <label className="block text-xs font-bold mb-1">最後の生理開始日</label>
            <input
              type="date"
              value={lastPeriodDate}
              onChange={(e) => setLastPeriodDate(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">周期（日数）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={21}
                  max={40}
                  value={periodCycle}
                  onChange={(e) => setPeriodCycle(parseInt(e.target.value) || 28)}
                  className="w-full p-2 border rounded text-sm text-center"
                />
                <span className="text-sm text-gray-500">日</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">生理期間</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={periodDuration}
                  onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 5)}
                  className="w-full p-2 border rounded text-sm text-center"
                />
                <span className="text-sm text-gray-500">日</span>
              </div>
            </div>
          </div>
          {lastPeriodDate && (
            <p className="text-sm text-pink-800">
              <span className="font-bold">次の生理予定日:</span>{" "}
              {(() => {
                const next = new Date(lastPeriodDate);
                next.setDate(next.getDate() + periodCycle);
                return next.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
              })()}
            </p>
          )}
          <p className="text-xs text-gray-500">カレンダーに生理予測・PMSが表示されます</p>
        </div>
      )}

      {gender !== "female" && (
        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          生理周期はプロフィールで性別を「女性」にすると表示されます。
        </p>
      )}

      <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-4">
        <h3 className="font-bold text-green-800">💊 服薬中の薬</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMedName}
            onChange={(e) => setNewMedName(e.target.value)}
            placeholder="薬の名前を入力"
            className="flex-1 p-2 border rounded text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (newMedName.trim()) {
                setMedications((prev) => [
                  ...prev,
                  { id: Date.now(), name: newMedName.trim(), timings: [] },
                ]);
                setNewMedName("");
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700"
          >
            追加
          </button>
        </div>
        {medications.length > 0 ? (
          <div className="space-y-3">
            {medications.map((med) => (
              <div key={med.id} className="bg-white p-3 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-green-800">{med.name}</span>
                  <button
                    type="button"
                    onClick={() => setMedications((prev) => prev.filter((m) => m.id !== med.id))}
                    className="text-red-500 hover:text-red-700 text-sm px-2"
                  >
                    🗑️ 削除
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {MEDICATION_TIMINGS.map((timing) => (
                    <button
                      key={timing}
                      type="button"
                      onClick={() => {
                        setMedications((prev) =>
                          prev.map((m) => {
                            if (m.id !== med.id) return m;
                            const newTimings = m.timings.includes(timing)
                              ? m.timings.filter((t) => t !== timing)
                              : [...m.timings, timing];
                            return { ...m, timings: newTimings };
                          })
                        );
                      }}
                      className={`py-2 rounded-lg border-2 font-bold text-xs transition ${
                        med.timings.includes(timing)
                          ? "border-green-500 bg-green-100 text-green-800"
                          : "border-gray-200 bg-gray-50 text-gray-400 hover:border-green-300"
                      }`}
                    >
                      {timing}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">薬が登録されていません</p>
        )}
        <p className="text-xs text-gray-500 mb-3">記録画面に服用タイミングが表示されます</p>
        <div className="border-t border-green-200 pt-3 mt-3">
          <p className="text-xs font-bold text-green-800 mb-2">リマインダー表示時刻（リマインダー画面で使用）</p>
          <div className="grid grid-cols-2 gap-2">
            {MEDICATION_TIMINGS.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 w-8">{t}</span>
                <input
                  type="time"
                  value={reminderTimes[t] ?? "08:00"}
                  onChange={(e) =>
                    setReminderTimes((prev) => ({ ...prev, [t]: e.target.value }))
                  }
                  className="flex-1 p-2 border rounded text-sm"
                />
              </div>
            ))}
          </div>
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
