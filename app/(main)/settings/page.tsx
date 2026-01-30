"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [settings, setSettings] = useState({
    mode_ibd: true,
    mode_alcohol: false,
    mode_mental: false,
    mode_diet: false, // 内部IDはdietのまま、表示はボディメイク
    medical_history: '',
    current_medications: '',
    gender: 'unspecified', // 性別
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data } = await supabase.from('user_settings').select('*').eq('user_id', session.user.id).single();
      if (data) {
        setSettings({
          mode_ibd: data.mode_ibd,
          mode_alcohol: data.mode_alcohol,
          mode_mental: data.mode_mental,
          mode_diet: data.mode_diet,
          medical_history: data.medical_history || '',
          current_medications: data.current_medications || '',
          gender: data.gender || 'unspecified',
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // ★ update ではなく upsert を使うのが正解！
    // これなら「初めての保存」でも自動で行を作ってくれます
    const { error } = await supabase.from('user_settings').upsert({
      user_id: session.user.id, // IDを明示的に含める
      ...settings,
      updated_at: new Date().toISOString() // 更新日時もあると便利
    });

    if (!error) {
      alert('設定を保存したわよ！これであんたのことをもっと厳しく指導できるわ💋');
    } else {
      console.error(error);
      alert('保存エラーよ！: ' + error.message);
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

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-4">
        <h3 className="font-bold text-blue-800">🤖 AIへの共有事項</h3>
        <div>
          <label className="block text-xs font-bold mb-1">🏥 既往歴・持病</label>
          <textarea name="medical_history" value={settings.medical_history} onChange={handleChange} className="w-full p-2 border rounded h-16 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">💊 処方薬</label>
          <textarea name="current_medications" value={settings.current_medications} onChange={handleChange} className="w-full p-2 border rounded h-16 text-sm" />
        </div>
      </div>

      <button onClick={handleSave} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">保存する</button>
      <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="w-full bg-gray-200 p-3 rounded-lg text-sm">ログアウト</button>
    </div>
  );
}