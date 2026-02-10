"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const MEDICATION_TIMINGS = ['朝', '昼', '晩', '眠前'];

interface Medication {
  id: number;
  name: string;
  timings: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [settings, setSettings] = useState({
    mode_ibd: true,
    mode_alcohol: false,
    mode_mental: false,
    mode_diet: false,
    medical_history: '',
    current_medications: '',
    gender: 'unspecified',
  });
  
  // 複数の薬を管理
  const [medications, setMedications] = useState<Medication[]>([]);
  const [newMedName, setNewMedName] = useState('');
  
  // 生理周期設定
  const [periodCycle, setPeriodCycle] = useState(28); // 周期日数
  const [periodDuration, setPeriodDuration] = useState(5); // 生理期間
  const [lastPeriodDate, setLastPeriodDate] = useState(''); // 最後の生理開始日

  useEffect(() => {
    const fetchSettings = async () => {
      const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
      const sessionData = await sessionRes.json();
      if (!sessionData.user) { router.push('/login'); return; }

      const res = await fetch('/api/user-settings', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login');
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        
        // current_medicationsからJSON形式で薬リストを取得
        let meds: Medication[] = [];
        try {
          const medData = JSON.parse(data.current_medications || '{}');
          // 新形式（配列）
          if (medData.medications && Array.isArray(medData.medications)) {
            meds = medData.medications;
          } 
          // 旧形式（単一の薬）からの移行
          else if (medData.name || medData.timings) {
            if (medData.name) {
              meds = [{ id: Date.now(), name: medData.name, timings: medData.timings || [] }];
            }
          }
        } catch {
          // 旧形式（プレーンテキスト）の場合
          if (data.current_medications) {
            meds = [{ id: Date.now(), name: data.current_medications, timings: [] }];
          }
        }
        
        // medical_historyから生理周期情報を取得
        let medHistory = '';
        let pCycle = 28;
        let pDuration = 5;
        let lastPeriod = '';
        try {
          const historyData = JSON.parse(data.medical_history || '{}');
          medHistory = historyData.text || '';
          pCycle = historyData.periodCycle || 28;
          pDuration = historyData.periodDuration || 5;
          lastPeriod = historyData.lastPeriodDate || '';
        } catch {
          // 旧形式（プレーンテキスト）の場合
          medHistory = data.medical_history || '';
        }
        
        setSettings({
          mode_ibd: data.mode_ibd ?? true,
          mode_alcohol: data.mode_alcohol ?? false,
          mode_mental: data.mode_mental ?? false,
          mode_diet: data.mode_diet ?? false,
          medical_history: data.medical_history || '',
          current_medications: data.current_medications || '',
          gender: data.gender || 'unspecified',
        });
        setMedications(meds);
        setPeriodCycle(pCycle);
        setPeriodDuration(pDuration);
        setLastPeriodDate(lastPeriod);
      } else {
        console.error('Settings fetch error:', res.status);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
    const sessionData = await sessionRes.json();
    if (!sessionData.user) return;

    // current_medicationsに複数の薬情報をJSON形式で保存
    const medicationData = JSON.stringify({
      medications: medications,
    });
    
    // medical_historyに生理周期情報を含めてJSON形式で保存
    // 旧テキストデータを取得
    let existingText = '';
    try {
      const parsed = JSON.parse(settings.medical_history || '{}');
      existingText = parsed.text || '';
    } catch {
      existingText = settings.medical_history || '';
    }
    
    const medicalData = JSON.stringify({
      text: existingText,
      periodCycle,
      periodDuration,
      lastPeriodDate,
    });
    
    const res = await fetch('/api/user-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        current_medications: medicationData,
        medical_history: medicalData,
      }),
      credentials: 'include',
    });

    if (res.ok) {
      alert('設定を保存したわよ！これであんたのことをもっと厳しく指導できるわ💋');
    } else {
      if (res.status === 401) {
        alert('セッションが切れました。再度ログインしてください。');
        router.push('/login');
        return;
      }
      console.error('Settings save error:', res.status);
      alert('保存エラーよ！: ' + res.statusText);
    }
  };
  

  const toggleMode = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof settings] }));
  };

  const handleChange = (e: any) => setSettings({ ...settings, [e.target.name]: e.target.value });

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-8 pb-20">
      <h2 className="text-xl font-bold">⚙️ 設定 & プロフィール</h2>

      <div className="bg-white p-4 rounded-xl border flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-700">使い方ガイド</h3>
          <p className="text-xs text-gray-500">モードやプロフィールの説明はこちら</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/guide')}
          className="text-sm font-bold text-blue-600"
        >
          開く
        </button>
      </div>
      
      {/* 性別設定 */}
      <div className="bg-white p-4 rounded-xl border space-y-2">
        <h3 className="font-bold text-gray-700">👤 基本情報</h3>
        <div>
          <label className="text-xs text-gray-500 block mb-1">性別 (生理予測などに使用)</label>
          <select name="gender" value={settings.gender} onChange={handleChange} className="w-full p-2 border rounded">
            <option value="unspecified">未設定</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border space-y-4">
        <h3 className="font-bold text-gray-700">使用モード</h3>
        <div className="flex justify-between items-center"><span>💊 IBD管理</span><input type="checkbox" checked={settings.mode_ibd} onChange={() => toggleMode('mode_ibd')} className="w-6 h-6" /></div>
        <div className="flex justify-between items-center"><span>🍺 アルコール管理</span><input type="checkbox" checked={settings.mode_alcohol} onChange={() => toggleMode('mode_alcohol')} className="w-6 h-6" /></div>
        <div className="flex justify-between items-center"><span>🌿 メンタルケア</span><input type="checkbox" checked={settings.mode_mental} onChange={() => toggleMode('mode_mental')} className="w-6 h-6" /></div>
        <div className="flex justify-between items-center"><span>💪 ボディメイク</span><input type="checkbox" checked={settings.mode_diet} onChange={() => toggleMode('mode_diet')} className="w-6 h-6 accent-purple-600" /></div>
      </div>

      {/* 薬の設定 */}
      <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-4">
        <h3 className="font-bold text-green-800">💊 お薬の設定</h3>
        
        {/* 新しい薬を追加 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMedName}
            onChange={e => setNewMedName(e.target.value)}
            placeholder="薬の名前を入力"
            className="flex-1 p-2 border rounded text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (newMedName.trim()) {
                setMedications(prev => [...prev, { 
                  id: Date.now(), 
                  name: newMedName.trim(), 
                  timings: [] 
                }]);
                setNewMedName('');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700"
          >
            追加
          </button>
        </div>
        
        {/* 登録済みの薬リスト */}
        {medications.length > 0 ? (
          <div className="space-y-3">
            {medications.map(med => (
              <div key={med.id} className="bg-white p-3 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-green-800">{med.name}</span>
                  <button
                    type="button"
                    onClick={() => setMedications(prev => prev.filter(m => m.id !== med.id))}
                    className="text-red-500 hover:text-red-700 text-sm px-2"
                  >
                    🗑️ 削除
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {MEDICATION_TIMINGS.map(timing => (
                    <button
                      key={timing}
                      type="button"
                      onClick={() => {
                        setMedications(prev => prev.map(m => {
                          if (m.id !== med.id) return m;
                          const newTimings = m.timings.includes(timing)
                            ? m.timings.filter(t => t !== timing)
                            : [...m.timings, timing];
                          return { ...m, timings: newTimings };
                        }));
                      }}
                      className={`py-2 rounded-lg border-2 font-bold text-xs transition ${
                        med.timings.includes(timing)
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-green-300'
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
          <p className="text-sm text-gray-500 text-center py-4">
            薬が登録されていません。上から追加してください。
          </p>
        )}
        
        <p className="text-xs text-gray-500">
          登録した薬と服用タイミングが記録画面に表示されます
        </p>
      </div>

      {/* 生理周期設定（女性の場合のみ表示） */}
      {settings.gender === 'female' && (
        <div className="bg-pink-50 p-4 rounded-xl border border-pink-200 space-y-4">
          <h3 className="font-bold text-pink-800">🩸 生理周期の設定</h3>
          
          <div>
            <label className="block text-xs font-bold mb-1">最後の生理開始日</label>
            <input
              type="date"
              value={lastPeriodDate}
              onChange={e => setLastPeriodDate(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">周期（日数）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="21"
                  max="40"
                  value={periodCycle}
                  onChange={e => setPeriodCycle(parseInt(e.target.value) || 28)}
                  className="w-full p-2 border rounded text-sm text-center"
                />
                <span className="text-sm text-gray-500">日</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">通常 21〜40日</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold mb-1">生理期間</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={periodDuration}
                  onChange={e => setPeriodDuration(parseInt(e.target.value) || 5)}
                  className="w-full p-2 border rounded text-sm text-center"
                />
                <span className="text-sm text-gray-500">日</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">通常 3〜7日</p>
            </div>
          </div>
          
          {lastPeriodDate && (
            <div className="bg-white p-3 rounded-lg border border-pink-200">
              <p className="text-sm text-pink-800">
                <span className="font-bold">次の生理予定日:</span>{' '}
                {(() => {
                  const next = new Date(lastPeriodDate);
                  next.setDate(next.getDate() + periodCycle);
                  return next.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
                })()}
              </p>
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            カレンダーに生理予測（🩸）と生理前（⚠️PMS）が表示されます
          </p>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-4">
        <h3 className="font-bold text-blue-800">🤖 AIへの共有事項</h3>
        <div>
          <label className="block text-xs font-bold mb-1">🏥 既往歴・持病</label>
          <textarea 
            value={(() => {
              try {
                const parsed = JSON.parse(settings.medical_history || '{}');
                return parsed.text || '';
              } catch {
                return settings.medical_history || '';
              }
            })()}
            onChange={e => {
              // 既存のJSON構造を維持しつつtextを更新
              let existing: Record<string, unknown> = {};
              try {
                existing = JSON.parse(settings.medical_history || '{}');
              } catch {
                // 旧形式の場合は新形式に移行
              }
              existing.text = e.target.value;
              setSettings({ ...settings, medical_history: JSON.stringify(existing) });
            }}
            className="w-full p-2 border rounded h-16 text-sm" 
            placeholder="例: 潰瘍性大腸炎、クローン病 など" 
          />
        </div>
      </div>

      <button onClick={handleSave} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">保存する</button>
      <button onClick={async () => { await signOut({ callbackUrl: '/login' }); }} className="w-full bg-gray-200 p-3 rounded-lg text-sm">ログアウト</button>
    </div>
  );
}