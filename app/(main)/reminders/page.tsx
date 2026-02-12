"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [newMemo, setNewMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchReminders = async () => {
    const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
    const sessionData = await sessionRes.json();
    if (!sessionData.user) {
      router.replace("/login");
      return;
    }
    const res = await fetch("/api/reminders", { credentials: "include" });
    if (res.status === 401) {
      router.replace("/login");
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setMedicationSchedule(data.medication_schedule ?? []);
      setCheckups(data.checkups ?? []);
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
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          due_date: newDueDate,
          memo: newMemo.trim() || undefined,
        }),
        credentials: "include",
      });
      if (res.ok) {
        setNewName("");
        setNewDueDate("");
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
    const res = await fetch(`/api/reminders/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) await fetchReminders();
    else alert("削除に失敗しました");
  };

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-gray-700 hover:bg-green-200 transition"
          aria-label="分析に戻る"
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
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 健康診断"
              className="w-full p-2 border rounded text-sm"
              required
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              required
            />
            <input
              type="text"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="メモ（任意）"
              className="w-full p-2 border rounded text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm disabled:opacity-50"
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
                    予定日: {c.due_date}
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
