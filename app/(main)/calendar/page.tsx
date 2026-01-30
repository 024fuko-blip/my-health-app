"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// プレレンダ時もビルドを通すためダミーを明示（本番では Cloud Run で環境変数設定）
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key"
);

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // ✏️ 編集モード用のState
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();

  // データ取得
  const fetchLogs = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDate}`;

    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (data) setLogs(data);
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

    const { error } = await supabase.from('health_logs').delete().eq('id', selectedLog.id);

    if (!error) {
      alert('削除しました🗑️');
      setSelectedLog(null);
      fetchLogs(); // カレンダー再読み込み
    } else {
      alert('削除エラー: ' + error.message);
    }
  };

  // 💾 更新処理
  const handleUpdate = async () => {
    const { error } = await supabase
      .from('health_logs')
      .update({
        general_mood: editForm.general_mood,
        pain_level: editForm.pain_level,
        meal_description: editForm.meal_description,
        memo: editForm.memo,
        weight: editForm.weight,
        steps: editForm.steps,
      })
      .eq('id', selectedLog.id);

    if (!error) {
      alert('修正しました✨');
      setIsEditing(false);
      setSelectedLog(editForm); // 表示を更新
      fetchLogs(); // カレンダー再読み込み
    } else {
      alert('更新エラー: ' + error.message);
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
      
      let bgColor = "bg-white";
      if (log) {
        if (log.general_mood <= 2) bgColor = "bg-red-50 hover:bg-red-100";
        else if (log.general_mood === 3) bgColor = "bg-blue-50 hover:bg-blue-100";
        else if (log.general_mood >= 4) bgColor = "bg-green-50 hover:bg-green-100";
      }

      cells.push(
        <div key={day} onClick={() => handleDateClick(day)} className={`h-24 border border-gray-100 p-1 cursor-pointer transition-colors relative ${bgColor}`}>
          <span className={`text-xs font-bold ${log ? 'text-gray-800' : 'text-gray-300'}`}>{day}</span>
          {log && (
            <div className="mt-1 flex flex-wrap gap-1 content-start">
              {log.pain_level >= 3 && <span title="腹痛">⚡</span>}
              {log.alcohol_amount > 0 && <span title="飲酒">🍺</span>}
              {log.ai_comment && <span title="AI">🤖</span>}
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
                    <button onClick={() => setIsEditing(true)} className="text-blue-600 bg-blue-50 px-3 py-1 rounded text-sm font-bold">✏️ 編集</button>
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
              // ✏️ 編集モード
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500">体調 (1-5)</label>
                  <input type="number" min="1" max="5" value={editForm.general_mood || 3} onChange={e => setEditForm({...editForm, general_mood: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">腹痛レベル (1-5)</label>
                  <input type="number" min="1" max="5" value={editForm.pain_level || 1} onChange={e => setEditForm({...editForm, pain_level: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">食事メモ</label>
                  <textarea value={editForm.meal_description || ''} onChange={e => setEditForm({...editForm, meal_description: e.target.value})} className="w-full border p-2 rounded h-20" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">メモ</label>
                  <textarea value={editForm.memo || ''} onChange={e => setEditForm({...editForm, memo: e.target.value})} className="w-full border p-2 rounded h-20" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div><label className="text-xs">体重(kg)</label><input type="number" value={editForm.weight || ''} onChange={e => setEditForm({...editForm, weight: e.target.value})} className="w-full border p-2 rounded" /></div>
                   <div><label className="text-xs">歩数</label><input type="number" value={editForm.steps || ''} onChange={e => setEditForm({...editForm, steps: e.target.value})} className="w-full border p-2 rounded" /></div>
                </div>
                <button onClick={handleUpdate} className="w-full bg-blue-600 text-white p-3 rounded font-bold">保存する</button>
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
                  <div className="bg-blue-50 p-2 rounded"><span className="text-xs font-bold text-blue-800 block">体調</span><span className="text-lg">Lv.{selectedLog.general_mood}</span></div>
                  <div className="bg-purple-50 p-2 rounded"><span className="text-xs font-bold text-purple-800 block">腹痛</span><span className="text-lg">Lv.{selectedLog.pain_level}</span></div>
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 whitespace-pre-wrap">{selectedLog.memo}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}