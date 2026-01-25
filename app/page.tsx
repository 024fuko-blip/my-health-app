"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Supabaseの設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const getTodayDate = () => {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = ('00' + (dt.getMonth()+1)).slice(-2);
  const d = ('00' + dt.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
};

export default function Home() {
  // ユーザー情報（ログインしているか？）
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login'); // ログインか登録か

  // アプリのステート
  const [date, setDate] = useState(getTodayDate());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mood, setMood] = useState('普通'); 
  const [sleepStart, setSleepStart] = useState('');
  const [sleepEnd, setSleepEnd] = useState('');
  const [meals, setMeals] = useState('');
  const [painLevel, setPainLevel] = useState(1);
  const [stoolType, setStoolType] = useState('普通');
  const [skinCondition, setSkinCondition] = useState('普通');
  const [periodStatus, setPeriodStatus] = useState('なし');
  const [weight, setWeight] = useState('');
  const [bpHigh, setBpHigh] = useState(''); 
  const [bpLow, setBpLow] = useState('');   
  const [screenTime, setScreenTime] = useState(''); 
  const [memo, setMemo] = useState(''); 
  
  const [logs, setLogs] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 起動時に「ログインしてる？」を確認
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        fetchLogs(session.user.id); // 自分のデータだけ読み込む
      }
    };
    checkUser();

    // ログイン状態が変わったら検知する
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchLogs(session.user.id);
      } else {
        setLogs([]); // ログアウトしたら空にする
        setGraphData([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 自分のデータだけ取得する関数
  const fetchLogs = async (userId: string) => {
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', userId) // ★ここ重要！自分のIDで絞り込み
      .order('date', { ascending: false });

    if (error) {
      console.error('エラー:', error);
    } else {
      setLogs(data || []);
      prepareGraphData(data || []);
    }
  };

  const prepareGraphData = (data: any[]) => {
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const moodScore: { [key: string]: number } = {
      "絶好調": 10, "良い": 8, "普通": 6, "少しだるい": 4, "お腹に違和感": 3, "悪い": 2, "最悪": 1
    };
    const formatted = sortedData.map(item => ({
      date: item.date.substring(5),
      pain: item.pain_level,
      moodScore: moodScore[item.mood] || 5,
      screen: item.screen_time || 0
    }));
    setGraphData(formatted);
  };

  // ログイン処理
  const handleAuth = async (e: any) => {
    e.preventDefault();
    setMessage('処理中...');
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(`エラー: ${error.message}`);
      else setMessage('登録成功！自動でログインします...');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`エラー: ${error.message}`);
      else setMessage('ログインしました！');
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage('ログアウトしました');
  };

  const callAiCoach = async () => {
    setIsLoading(true);
    setAiAdvice('コーチを呼び出しています...🚪');
    try {
      const res = await fetch('/api/advice', { method: 'POST' });
      const data = await res.json();
      setAiAdvice(data.advice);
    } catch (e) {
      setAiAdvice('エラーが発生しました💦');
    } finally {
      setIsLoading(false);
    }
  };

  // データ保存（user_id付きで！）
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return; // 念のため

    const formData = { 
        user_id: user.id, // ★ここ重要！自分の名札をつける
        date, mood, sleep_start: sleepStart, sleep_end: sleepEnd, meals,
        pain_level: painLevel, stool_type: stoolType, skin_condition: skinCondition,
        period_status: periodStatus, weight: weight ? parseFloat(weight) : null,
        bp_high: bpHigh ? parseInt(bpHigh) : null, bp_low: bpLow ? parseInt(bpLow) : null,
        screen_time: screenTime ? parseFloat(screenTime) : null, memo 
    };

    let error;
    if (editingId) {
        const { error: updateError } = await supabase.from('health_logs').update(formData).eq('id', editingId);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('health_logs').insert([formData]);
        error = insertError;
    }

    if (error) {
      setMessage('エラーが発生しました💦');
      console.error(error);
    } else {
      setMessage(editingId ? '修正しました！✨' : '記録しました！✨');
      resetForm();
      fetchLogs(user.id);
    }
  };

  // その他の関数（省略なし）
  const handleDateChange = (value: any) => {
    const dt = new Date(value);
    const y = dt.getFullYear();
    const m = ('00' + (dt.getMonth()+1)).slice(-2);
    const d = ('00' + dt.getDate()).slice(-2);
    const selectedDate = `${y}-${m}-${d}`;
    setDate(selectedDate);
    const logOnDate = logs.find(log => log.date === selectedDate);
    if (logOnDate) { handleEdit(logOnDate); setMessage(`📅 ${selectedDate} の記録を表示中`); }
    else { resetForm(); setDate(selectedDate); setMessage(`📅 ${selectedDate} の新規記録`); }
  };
  const resetForm = () => {
    setEditingId(null); setMood('普通'); setSleepStart(''); setSleepEnd(''); setMeals('');
    setPainLevel(1); setStoolType('普通'); setSkinCondition('普通'); setPeriodStatus('なし');
    setWeight(''); setBpHigh(''); setBpLow(''); setScreenTime(''); setMemo('');
  };
  const handleEdit = (log: any) => {
    setEditingId(log.id); setDate(log.date); setMood(log.mood || '普通');
    setSleepStart(log.sleep_start || ''); setSleepEnd(log.sleep_end || '');
    setMeals(log.meals || ''); setPainLevel(log.pain_level || 1);
    setStoolType(log.stool_type || '普通'); setSkinCondition(log.skin_condition || '普通');
    setPeriodStatus(log.period_status || 'なし'); setWeight(log.weight || '');
    setBpHigh(log.bp_high || ''); setBpLow(log.bp_low || '');
    setScreenTime(log.screen_time || ''); setMemo(log.memo || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); setMessage('✏️ 編集モードです');
  };
  const handleDelete = async (id: number) => {
    if (!confirm('本当にこの記録を削除しますか？')) return;
    const { error } = await supabase.from('health_logs').delete().eq('id', id);
    if (error) alert('削除失敗💦');
    else { setMessage('🗑️ 削除しました'); if(user) fetchLogs(user.id); resetForm(); }
  };

  // ▼▼▼ 画面表示（ログインしていない場合） ▼▼▼
  if (!user) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif', textAlign: 'center', border: '1px solid #ddd', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#0070f3' }}>🩺 IBD管理アプリ</h1>
        <p>ログインして記録を始めましょう</p>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
          <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
          <button type="submit" style={{ padding: '10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            {authMode === 'login' ? 'ログイン' : '新規登録'}
          </button>
        </form>
        <p style={{ fontSize: '14px', marginTop: '15px', color: '#666' }}>
          {authMode === 'login' ? 'アカウントをお持ちでないですか？' : 'すでにアカウントをお持ちですか？'}
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#0070f3', textDecoration: 'underline', cursor: 'pointer', marginLeft: '5px' }}>
            {authMode === 'login' ? '新規登録する' : 'ログインする'}
          </button>
        </p>
        {message && <p style={{ color: 'red' }}>{message}</p>}
      </div>
    );
  }

  // ▼▼▼ 画面表示（ログイン済み：いつものアプリ画面） ▼▼▼
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: '#333' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h1 style={{ margin:0, color: '#0070f3' }}>🩺 IBD & 健康管理ログ</h1>
        <button onClick={handleLogout} style={{background:'#eee', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>🚪 ログアウト</button>
      </div>

      {/* 以下、いつものグラフ・カレンダー・入力フォーム */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>📈 体調とスマホ時間の推移</h3>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="moodScore" name="気分" stroke="#0070f3" strokeWidth={3} />
              <Line type="monotone" dataKey="pain" name="痛み" stroke="#ff0000" strokeWidth={2} />
              <Line type="monotone" dataKey="screen" name="スマホ" stroke="#28a745" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#fff0f5', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '2px solid #d63384', textAlign:'center' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#d63384' }}>👹 専属・鬼コーチ</h3>
        {!aiAdvice && (<button onClick={callAiCoach} disabled={isLoading} style={{ padding: '15px 30px', background: '#d63384', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>{isLoading ? '呼び出し中...' : 'コーチに診断してもらう！'}</button>)}
        {aiAdvice && (<div style={{ textAlign: 'left', whiteSpace: 'pre-wrap', lineHeight: '1.8', background: 'white', padding: '15px', borderRadius: '10px' }}>{aiAdvice}<div style={{textAlign:'center', marginTop:'15px'}}><button onClick={() => setAiAdvice('')} style={{background:'#eee', border:'none', padding:'8px 15px', borderRadius:'20px', cursor:'pointer'}}>閉じる</button></div></div>)}
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>📅 カレンダーから選択</h3>
        <Calendar onChange={handleDateChange} value={new Date(date)} locale="ja-JP" />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: editingId ? '3px solid #0070f3' : 'none' }}>
        {editingId && <div style={{background:'#e3f2fd', padding:'10px', borderRadius:'5px', textAlign:'center', fontWeight:'bold', color:'#0070f3'}}>✏️ 編集モード中</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><label>📅 日付</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius:'8px', border:'1px solid #ccc' }} /></div>
          <div><label>😊 気分</label><select value={mood} onChange={(e) => setMood(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius:'8px', border:'1px solid #ccc', background:'#f0f8ff' }}><option value="絶好調">🌟 絶好調</option><option value="良い">😃 良い</option><option value="普通">🙂 普通</option><option value="少しだるい">☁️ だるい</option><option value="お腹に違和感">🌀 違和感</option><option value="悪い">😞 悪い</option><option value="最悪">😫 最悪</option></select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><label>🛌 就寝</label><input type="time" value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} style={{width:'100%', padding:'10px', border:'1px solid #ccc', borderRadius:'8px'}} /></div>
            <div><label>🌅 起床</label><input type="time" value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} style={{width:'100%', padding:'10px', border:'1px solid #ccc', borderRadius:'8px'}} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><label>⚖️ 体重(kg)</label><input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'5px'}} /></div>
            <div><label>📱 スマホ(h)</label><input type="number" step="0.1" value={screenTime} onChange={(e) => setScreenTime(e.target.value)} style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'5px'}} /></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>🩺 血圧:</label><input type="number" placeholder="上" value={bpHigh} onChange={(e) => setBpHigh(e.target.value)} style={{width:'80px', padding:'8px', border:'1px solid #ddd', borderRadius:'5px'}} /> / <input type="number" placeholder="下" value={bpLow} onChange={(e) => setBpLow(e.target.value)} style={{width:'80px', padding:'8px', border:'1px solid #ddd', borderRadius:'5px'}} />
        </div>
        <div><label>🍽️ 食事</label><textarea value={meals} onChange={(e) => setMeals(e.target.value)} style={{ width: '100%', padding: '10px', height: '60px', borderRadius:'8px', border:'1px solid #ccc' }} /></div>
        <div style={{ background:'#fff0f5', padding:'10px', borderRadius:'10px'}}>
            <label style={{color:'#d63384'}}>⚡ 痛み (Lv{painLevel})</label><input type="range" min="1" max="5" value={painLevel} onChange={(e) => setPainLevel(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#d63384' }} />
            <div style={{marginTop:'5px'}}><label>🚽 便: </label><select value={stoolType} onChange={(e) => setStoolType(e.target.value)} style={{padding:'5px'}}><option value="普通">普通</option><option value="軟便">軟便</option><option value="下痢">下痢</option><option value="コロコロ">コロコロ</option><option value="血便">⚠️ 血便</option></select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><label>🩸 生理</label><select value={periodStatus} onChange={(e) => setPeriodStatus(e.target.value)} style={{width:'100%', padding:'8px'}}><option value="なし">なし</option><option value="生理前">生理前</option><option value="生理中">生理中</option></select></div>
            <div><label>✨ 肌</label><select value={skinCondition} onChange={(e) => setSkinCondition(e.target.value)} style={{width:'100%', padding:'8px'}}><option value="普通">普通</option><option value="良い">良い</option><option value="荒れ気味">荒れ気味</option><option value="ニキビ">ニキビ</option></select></div>
        </div>
        <div><label>💬 メモ</label><textarea value={memo} onChange={(e) => setMemo(e.target.value)} style={{ width: '100%', padding: '10px', height: '50px', borderRadius:'8px', border:'1px solid #ccc' }} /></div>
        <div style={{display:'flex', gap:'10px'}}>
            {editingId && <button type="button" onClick={resetForm} style={{ flex:1, padding: '15px', background: '#aaa', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>キャンセル</button>}
            <button type="submit" style={{ flex:2, padding: '15px', background: editingId ? 'linear-gradient(45deg, #ff9800, #ff5722)' : 'linear-gradient(45deg, #0070f3, #00c6ff)', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>{editingId ? '修正内容を保存 💾' : '記録して報告 📝'}</button>
        </div>
        {message && <p style={{ textAlign: 'center', color: '#2e7d32', fontWeight: 'bold' }}>{message}</p>}
      </form>

      <div style={{ marginTop: '30px' }}>
        <h2>📜 過去の記録</h2>
        {logs.map((log) => (
          <div key={log.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '12px', marginBottom: '15px', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position:'relative' }}>
            <div style={{position:'absolute', top:'15px', right:'15px', display:'flex', gap:'10px'}}>
                <button onClick={() => handleEdit(log)} style={{background:'#e3f2fd', border:'none', borderRadius:'5px', padding:'5px 10px', cursor:'pointer', color:'#0070f3'}}>✏️</button>
                <button onClick={() => handleDelete(log.id)} style={{background:'#ffebee', border:'none', borderRadius:'5px', padding:'5px 10px', cursor:'pointer', color:'#d32f2f'}}>🗑️</button>
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', borderBottom:'2px solid #f0f0f0', paddingBottom:'5px', marginBottom:'10px' }}>{log.date} <span style={{color:'#0070f3', marginLeft:'10px'}}>{log.mood}</span></div>
            <div style={{ fontSize: '14px', color: '#444' }}>
              {log.meals && <div>🍽️ {log.meals}</div>}
              <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'5px'}}>
                  {log.pain_level && <span style={{color:'#d63384'}}>⚡ Lv{log.pain_level}</span>}
                  {log.stool_type && <span>🚽 {log.stool_type}</span>}
                  {log.screen_time && <span>📱 {log.screen_time}h</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}