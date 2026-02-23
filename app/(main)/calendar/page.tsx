"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { HealthLogApiResponse, CalendarEditForm } from '../record/hooks/record-form-types';

/** 生理周期に基づいて日付の状態を判定 */
interface PeriodStatus {
  type: 'period' | 'pms' | 'ovulation' | 'fertile' | null;
  isOvulationDay?: boolean;
}

function getPeriodStatus(
  dateStr: string,
  lastPeriodDate: string,
  periodCycle: number,
  periodDuration: number
): PeriodStatus {
  if (!lastPeriodDate) return { type: null };
  
  const targetDate = new Date(dateStr);
  const lastPeriod = new Date(lastPeriodDate);
  
  // 過去と未来の生理日を計算（前後数周期分）
  for (let i = -3; i <= 6; i++) {
    const periodStart = new Date(lastPeriod);
    periodStart.setDate(periodStart.getDate() + (periodCycle * i));
    
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDuration - 1);
    
    // 排卵日は次の生理開始の14日前
    const ovulationDay = new Date(periodStart);
    ovulationDay.setDate(ovulationDay.getDate() + periodCycle - 14);
    
    // 妊娠しやすい期間（排卵日の5日前〜排卵日）
    const fertileStart = new Date(ovulationDay);
    fertileStart.setDate(fertileStart.getDate() - 5);
    
    const pmsStart = new Date(periodStart);
    pmsStart.setDate(pmsStart.getDate() + periodCycle - 10); // PMS期間: 次の生理10日前〜
    
    // 生理中
    if (targetDate >= periodStart && targetDate <= periodEnd) {
      return { type: 'period' };
    }
    
    // 排卵日
    if (targetDate.toDateString() === ovulationDay.toDateString()) {
      return { type: 'ovulation', isOvulationDay: true };
    }
    
    // 妊娠しやすい期間（排卵日前の数日）
    if (targetDate >= fertileStart && targetDate < ovulationDay) {
      return { type: 'fertile' };
    }
    
    // PMS期間（生理前10日間、ただし妊娠しやすい期間と重複しない）
    if (targetDate >= pmsStart && targetDate < new Date(periodStart.getTime() + periodCycle * 24 * 60 * 60 * 1000)) {
      // 次の周期の開始前まで
      const nextPeriodStart = new Date(periodStart);
      nextPeriodStart.setDate(nextPeriodStart.getDate() + periodCycle);
      if (targetDate < nextPeriodStart) {
        return { type: 'pms' };
      }
    }
  }
  
  return { type: null };
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<HealthLogApiResponse[]>([]);
  const [selectedLog, setSelectedLog] = useState<HealthLogApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ✏️ 編集モード用のState
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CalendarEditForm>({});
  
  // 生理周期情報
  const [periodSettings, setPeriodSettings] = useState({
    lastPeriodDate: '',
    periodCycle: 28,
    periodDuration: 5,
    gender: 'unspecified',
    showPeriodOnCalendar: true,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();

  // データ取得
  const fetchLogs = async () => {
    setLoading(true);
    const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
    const sessionData = await sessionRes.json();
    if (!sessionData.user) {
      setLoading(false);
      return;
    }

    // 設定を取得（生理周期情報含む）
    const settingsRes = await fetch('/api/user-settings', { credentials: 'include' });
    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      try {
        const medHistory = JSON.parse(settingsData.medical_history || '{}');
        setPeriodSettings({
          lastPeriodDate: medHistory.lastPeriodDate || '',
          periodCycle: medHistory.periodCycle || 28,
          periodDuration: medHistory.periodDuration || 5,
          gender: settingsData.gender || 'unspecified',
          showPeriodOnCalendar: medHistory.showPeriodOnCalendar !== false,
        });
      } catch {
        // パースエラー時はデフォルト値を維持
      }
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDate}`;

    const res = await fetch(`/api/health-logs?startDate=${startDate}&endDate=${endDate}`, {
      credentials: 'include',
    });
    if (res.status === 401) {
      router.replace('/login');
      setLoading(false);
      return;
    }
    const data = res.ok ? await res.json() : [];
    if (Array.isArray(data)) setLogs(data);
    if (!res.ok) {
      console.error('Calendar fetch error:', res.status, await res.text().catch(() => ''));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [currentDate]);

  // 日付クリック
  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = logs.find(l => l.date === dateStr);
    
    if (log) {
      setSelectedLog(log);
      setEditForm(log); // 編集用にデータをコピー
      setIsEditing(false); // 最初は閲覧モード
    } else {
      // 記録がない日は何もしない
      alert(`${dateStr} の記録はありません。記録ページから入力してください 📝`);
    }
  };

  // 🗑️ 削除処理
  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;

    const res = await fetch(`/api/health-logs?id=${selectedLog!.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      alert('削除しました🗑️');
      setSelectedLog(null);
      fetchLogs(); // カレンダー再読み込み
    } else {
      if (res.status === 401) {
        alert('セッションが切れました。再度ログインしてください。');
        router.replace('/login');
        return;
      }
      console.error('Delete error:', res.status);
      alert('削除エラー: ' + res.statusText);
    }
  };

  // 💾 更新処理
  const handleUpdate = async () => {
    const res = await fetch('/api/health-logs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedLog!.id,
        general_mood: editForm.general_mood,
        pain_level: editForm.pain_level,
        meal_description: editForm.meal_description,
        memo: editForm.memo,
        weight: editForm.weight,
        steps: editForm.steps,
        period_status: editForm.period_status,
        stool_type: editForm.stool_type,
        alcohol_amount: editForm.alcohol_amount,
        stress_level: editForm.stress_level,
        sleep_quality: editForm.sleep_quality,
        body_fat: editForm.body_fat,
        calories: editForm.calories,
        protein: editForm.protein,
      }),
      credentials: 'include',
    });

    if (res.ok) {
      alert('修正しました✨');
      setIsEditing(false);
      setSelectedLog((prev) =>
        prev ? ({ ...prev, ...editForm } as HealthLogApiResponse) : null
      ); // 表示を更新
      fetchLogs(); // カレンダー再読み込み
    } else {
      if (res.status === 401) {
        alert('セッションが切れました。再度ログインしてください。');
        router.replace('/login');
        return;
      }
      console.error('Update error:', res.status);
      alert('更新エラー: ' + res.statusText);
    }
  };

  // 月変更
  const changeMonth = (diff: number) => {
    setCurrentDate(new Date(year, month - 1 + diff, 1));
    setSelectedLog(null);
  };

  const renderCalendarCells = () => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-100"></div>);
    
    for (let day = 1; day <= lastDate; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const log = logs.find(l => l.date === dateStr);
      
      // 生理周期の状態を取得（女性のみ・表示ON時のみ）
      const periodStatus = periodSettings.showPeriodOnCalendar && periodSettings.gender === 'female'
        ? getPeriodStatus(dateStr, periodSettings.lastPeriodDate, periodSettings.periodCycle, periodSettings.periodDuration)
        : { type: null };
      
      // 背景色を決定（優先度: 記録の体調 > 生理周期）
      let bgColor = "bg-white";
      let borderColor = "border-gray-100";
      
      // 生理周期による色分け（薄くシンプル）
      if (periodStatus.type === 'period') {
        bgColor = "bg-pink-50/70";
        borderColor = "border-pink-100";
      } else if (periodStatus.type === 'ovulation') {
        bgColor = "bg-purple-50/50";
        borderColor = "border-purple-100";
      } else if (periodStatus.type === 'fertile') {
        bgColor = "bg-purple-50/40";
        borderColor = "border-purple-100";
      } else if (periodStatus.type === 'pms') {
        bgColor = "bg-amber-50/50";
        borderColor = "border-amber-100";
      }
      
      // 記録がある場合は体調で上書き（生理周期情報がない場合のみ）
      if (log && !periodStatus.type && log.general_mood != null) {
        if (log.general_mood <= 2) {
          bgColor = "bg-red-50";
        } else if (log.general_mood === 3) {
          bgColor = "bg-blue-50";
        } else if (log.general_mood >= 4) {
          bgColor = "bg-green-50";
        }
      }

      cells.push(
        <div 
          key={day} 
          onClick={() => handleDateClick(day)} 
          className={`h-24 border p-1 cursor-pointer transition-colors relative ${bgColor} ${borderColor} hover:opacity-80`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${log ? 'text-gray-800' : 'text-gray-400'}`}>{day}</span>
            {/* 生理周期アイコン（表示ON時のみ） */}
            <div className="flex gap-0.5">
              {periodStatus.type === 'period' && <span className="text-xs opacity-80" title="生理予測">🩸</span>}
              {periodStatus.type === 'ovulation' && <span className="text-xs opacity-80" title="排卵日">🥚</span>}
              {periodStatus.type === 'fertile' && <span className="text-xs opacity-80" title="妊娠しやすい">💜</span>}
              {periodStatus.type === 'pms' && <span className="text-xs opacity-80" title="PMS期間">⚠️</span>}
            </div>
          </div>
          {log && (
            <div className="mt-1 flex flex-wrap gap-1 content-start">
              {(log.pain_level ?? 0) >= 3 && <span title="腹痛">⚡</span>}
              {(log.alcohol_amount ?? 0) > 0 && <span title="飲酒">🍺</span>}
              {log.ai_comment && <span title="AI">🤖</span>}
              {(log.period_status === '生理中' || log.period_status === '生理終了') && (
                <span title={log.period_status === '生理終了' ? '生理終了（記録）' : '生理中（記録）'}>
                  {log.period_status === '生理終了' ? '✓' : '💧'}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="pb-24">
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm">
        <button onClick={() => changeMonth(-1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded">◀</button>
        <h2 className="text-xl font-bold">{year}年 {month}月</h2>
        <button onClick={() => changeMonth(1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded">▶</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 text-center bg-gray-50 border-b">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d} className="py-2 text-xs font-bold text-gray-500">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">{renderCalendarCells()}</div>
      </div>
      
      {/* 凡例（生理周期表示ON時のみ） */}
      {periodSettings.showPeriodOnCalendar && periodSettings.gender === 'female' && periodSettings.lastPeriodDate && (
        <div className="mt-4 bg-white p-3 shadow-kirei-card border border-[var(--color-border)]">
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] mb-2">📅 カレンダーの見方</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-pink-50/70 border border-pink-100"></span>
              <span className="text-[var(--color-text-muted)]">🩸 生理予測</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-purple-50/50 border border-purple-100"></span>
              <span className="text-[var(--color-text-muted)]">🥚 排卵日</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-purple-50/40 border border-purple-100"></span>
              <span className="text-[var(--color-text-muted)]">💜 妊娠しやすい</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-amber-50/50 border border-amber-100"></span>
              <span className="text-[var(--color-text-muted)]">⚠️ PMS/肌荒れ期</span>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">💧 = 生理中、✓ = 生理終了（記録）</p>
        </div>
      )}

      {/* 詳細・編集モーダル */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            
            {/* ヘッダー: 日付と操作ボタン */}
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-xl font-bold">{selectedLog.date}</h3>
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(true)} className="text-[var(--color-sage)] bg-[var(--color-accent-pink)]/30 px-3 py-1 text-sm font-bold">✏️ 編集</button>
                    {/* ▼▼▼ ここを修正しました ▼▼▼ */}
                    <button onClick={handleDelete} className="text-red-600 bg-red-50 px-3 py-1 rounded text-sm font-bold">🗑️ 削除</button>
                    {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}
                  </>
                ) : (
                  <button onClick={() => setIsEditing(false)} className="text-gray-500 text-sm">キャンセル</button>
                )}
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 text-2xl ml-2">×</button>
              </div>
            </div>

            {isEditing ? (
              // ✏️ 編集モード（全フィールド対応）
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-bold text-gray-500">体調 (1-5)</label><input type="number" min="1" max="5" value={editForm.general_mood ?? 3} onChange={e => setEditForm({...editForm, general_mood: parseInt(e.target.value)})} className="w-full border p-2 rounded" /></div>
                  <div><label className="text-xs font-bold text-gray-500">腹痛 (1-5)</label><input type="number" min="1" max="5" value={editForm.pain_level ?? 1} onChange={e => setEditForm({...editForm, pain_level: parseInt(e.target.value)})} className="w-full border p-2 rounded" /></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">生理</label>
                  <select value={editForm.period_status || 'なし'} onChange={e => setEditForm({...editForm, period_status: e.target.value})} className="w-full border p-2 rounded">
                    <option value="なし">なし</option>
                    <option value="生理中">生理中</option>
                    <option value="生理終了">生理終了</option>
                  </select>
                </div>
                <div><label className="text-xs font-bold text-gray-500">便・トイレ</label><input type="text" placeholder="例: 普通 / トイレ3回" value={editForm.stool_type || ''} onChange={e => setEditForm({...editForm, stool_type: e.target.value})} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs font-bold text-gray-500">食事メモ</label><textarea value={editForm.meal_description || ''} onChange={e => setEditForm({...editForm, meal_description: e.target.value})} className="w-full border p-2 rounded h-16" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-bold">体重(kg)</label><input type="number" step="0.1" value={editForm.weight ?? ''} onChange={e => setEditForm({...editForm, weight: e.target.value})} className="w-full border p-2 rounded" /></div>
                  <div><label className="text-xs font-bold">歩数</label><input type="number" value={editForm.steps ?? ''} onChange={e => setEditForm({...editForm, steps: e.target.value})} className="w-full border p-2 rounded" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-bold">飲酒量(ml)</label><input type="number" value={editForm.alcohol_amount ?? 0} onChange={e => setEditForm({...editForm, alcohol_amount: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded" /></div>
                  <div><label className="text-xs font-bold">ストレス (1-10)</label><input type="number" min="1" max="10" value={editForm.stress_level ?? ''} onChange={e => setEditForm({...editForm, stress_level: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full border p-2 rounded" /></div>
                </div>
                <div><label className="text-xs font-bold">睡眠の質</label><select value={editForm.sleep_quality || '普通'} onChange={e => setEditForm({...editForm, sleep_quality: e.target.value})} className="w-full border p-2 rounded"><option value="悪い">悪い</option><option value="普通">普通</option><option value="良い">良い</option></select></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs font-bold">体脂肪(%)</label><input type="number" step="0.1" value={editForm.body_fat ?? ''} onChange={e => setEditForm({...editForm, body_fat: e.target.value})} className="w-full border p-2 rounded" /></div>
                  <div><label className="text-xs font-bold">カロリー</label><input type="number" value={editForm.calories ?? ''} onChange={e => setEditForm({...editForm, calories: e.target.value})} className="w-full border p-2 rounded" /></div>
                  <div><label className="text-xs font-bold">タンパク質(g)</label><input type="number" step="0.1" value={editForm.protein ?? ''} onChange={e => setEditForm({...editForm, protein: e.target.value})} className="w-full border p-2 rounded" /></div>
                </div>
                <div><label className="text-xs font-bold text-gray-500">メモ</label><textarea value={editForm.memo || ''} onChange={e => setEditForm({...editForm, memo: e.target.value})} className="w-full border p-2 rounded h-16" /></div>
                <button onClick={handleUpdate} className="w-full bg-[var(--color-sage)] text-white p-3 font-bold">保存する</button>
              </div>
            ) : (
              // 👀 閲覧モード
              <div className="space-y-4">
                {selectedLog.ai_comment && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                    <h4 className="font-bold text-red-800 text-sm mb-1">👹 鬼コーチ</h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedLog.ai_comment}</p>
                  </div>
                )}
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <h4 className="font-bold text-orange-800 text-sm">🍽️ 食事メモ</h4>
                  <p className="text-sm">{selectedLog.meal_description || "なし"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 p-2 rounded"><span className="text-xs font-bold text-blue-800 block">体調</span><span className="text-lg">Lv.{selectedLog.general_mood ?? "—"}</span></div>
                  <div className="bg-purple-50 p-2 rounded"><span className="text-xs font-bold text-purple-800 block">腹痛</span><span className="text-lg">Lv.{selectedLog.pain_level ?? "—"}</span></div>
                  {(selectedLog.period_status && selectedLog.period_status !== "なし") && <div className="bg-pink-50 p-2 rounded"><span className="text-xs font-bold text-pink-800 block">生理</span><span className="text-sm">{selectedLog.period_status}</span></div>}
                  {(selectedLog.alcohol_amount ?? 0) > 0 && <div className="bg-amber-50 p-2 rounded"><span className="text-xs font-bold text-amber-800 block">飲酒</span><span className="text-sm">{selectedLog.alcohol_amount}ml</span></div>}
                </div>
                {(selectedLog.stress_level != null || selectedLog.sleep_quality) && (
                  <div className="flex gap-2 text-xs">
                    {selectedLog.stress_level != null && <span className="bg-indigo-50 px-2 py-1 rounded">ストレス Lv.{selectedLog.stress_level}</span>}
                    {selectedLog.sleep_quality && <span className="bg-indigo-50 px-2 py-1 rounded">睡眠 {selectedLog.sleep_quality}</span>}
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 whitespace-pre-wrap">{selectedLog.memo || "—"}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}