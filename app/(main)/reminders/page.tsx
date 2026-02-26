"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ensureSession, handleUnauthorized, apiFetch, apiPost, apiDelete } from "@/lib/api-client";
import PushNotifyButton from "./components/PushNotifyButton";

interface MedicationItem {
  time: string;
  label: string;
  medications: string[];
}

interface CheckupItem {
  id: string;
  name: string;
  due_date: string;
  scheduled_time: string | null;
  memo: string | null;
  created_at: string;
}

export default function RemindersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [medicationSchedule, setMedicationSchedule] = useState<MedicationItem[]>([]);
  const [checkups, setCheckups] = useState<CheckupItem[]>([]);
  const [showAddCheckup, setShowAddCheckup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newScheduledTime, setNewScheduledTime] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [hospitalNames, setHospitalNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchReminders = async () => {
    const session = await ensureSession(router);
    if (!session) return;
    const res = await apiFetch("/api/reminders");
    if (res.status === 401) {
      handleUnauthorized(router);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setMedicationSchedule(data.medication_schedule ?? []);
      setCheckups(data.checkups ?? []);
      setHospitalNames(data.hospital_names ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReminders();
  }, [router]);

  const handleAddCheckup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDueDate) return;
    setSaving(true);
    try {
      const result = await apiPost<Record<string, unknown>>("/api/reminders", {
        name: newName.trim(),
        due_date: newDueDate,
        scheduled_time: newScheduledTime.trim() || undefined,
        memo: newMemo.trim() || undefined,
      });
      if (result.ok) {
        setNewName("");
        setNewDueDate("");
        setNewScheduledTime("");
        setNewMemo("");
        setShowAddCheckup(false);
        await fetchReminders();
      } else {
        alert("追加に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCheckup = async (id: string) => {
    if (!confirm("この検診リマインダーを削除しますか？")) return;
    const delResult = await apiDelete(`/api/reminders/${id}`);
    if (delResult.ok) await fetchReminders();
    else alert("削除に失敗しました");
  };

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-gray-700 hover:bg-green-200 transition"
          aria-label="設定に戻る"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-green-900">⏰ リマインダー</h1>
      </div>

      <section className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h2 className="font-bold text-green-800 mb-3">💊 今日の服薬</h2>
        <PushNotifyButton />
        {medicationSchedule.length > 0 ? (
          <ul className="space-y-2">
            {medicationSchedule.map((item, i) => (
              <li key={i} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-green-100">
                <span className="font-mono font-bold text-green-700 w-12">{item.time}</span>
                <span className="text-sm text-gray-700">{item.medications.join("、")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">
            設定の「健康管理」で服薬中の薬とタイミング（朝・昼・晩・眠前）を登録すると、ここに今日の服薬スケジュールが表示されます。
          </p>
        )}
        <Link
          href="/settings/health"
          className="inline-block mt-2 text-sm text-green-700 font-medium hover:underline"
        >
          健康管理で薬を登録 →
        </Link>
      </section>

      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-blue-800">🏥 検診リマインダー</h2>
          <button
            type="button"
            onClick={() => setShowAddCheckup(!showAddCheckup)}
            className="text-sm font-bold text-blue-600 hover:text-blue-800"
          >
            {showAddCheckup ? "キャンセル" : "+ 追加"}
          </button>
        </div>

        {showAddCheckup && (
          <form onSubmit={handleAddCheckup} className="mb-4 p-3 bg-white rounded-lg border border-blue-100 space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">病院名</label>
              <input
                type="text"
                list="hospital-history"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 〇〇病院"
                className="w-full p-2 border rounded text-sm"
                required
              />
              <datalist id="hospital-history">
                {hospitalNames.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">予定日</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">予約時間（任意）</label>
                <input
                  type="time"
                  value={newScheduledTime}
                  onChange={(e) => setNewScheduledTime(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">メモ（任意）</label>
              <input
                type="text"
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="例: 持参物、注意事項"
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-[var(--color-sage)] text-white font-bold text-sm disabled:opacity-50 hover:opacity-90"
            >
              {saving ? "保存中..." : "追加する"}
            </button>
          </form>
        )}

        {checkups.length > 0 ? (
          <ul className="space-y-2">
            {checkups.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100"
              >
                <div>
                  <p className="font-bold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.due_date}
                    {c.scheduled_time ? ` ${c.scheduled_time}` : ""}
                    {c.memo ? ` ・ ${c.memo}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCheckup(c.id)}
                  className="text-red-500 hover:text-red-700 text-sm px-2 shrink-0"
                  aria-label="削除"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">
            健康診断や検診の予定日を登録しておくと、忘れずに管理できます。
          </p>
        )}
      </section>
    </div>
  );
}
