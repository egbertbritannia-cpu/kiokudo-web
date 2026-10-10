'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Session = {
  id: string; title?: string; section?: string; score?: string;
  band?: number | null; date?: string; rawScore?: number | null;
};
type Mistake = { category?: string; mistakeCategory?: string; title?: string; rootCauseAnalysis?: string };
type Dashboard = {
  skillBands?: { skill: string; current: number | null }[];
  recentSessions?: Session[];
};
type LocalTest = { name: string; score: number };

function rawBand(raw: number): string {
  return (raw>=39?9:raw>=37?8.5:raw>=35?8:raw>=33?7.5:raw>=30?7:raw>=27?6.5:6).toFixed(1);
}

export default function AlbionTracker() {
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [remoteMistakes, setRemoteMistakes] = useState<Mistake[]>([]);
  const [tests, setTests] = useState<LocalTest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [testName, setTestName] = useState('');
  const [score, setScore] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('albion_tracker_local_logs_v1');
      if (raw) { const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed)) {
        setTests(parsed.filter((x): x is LocalTest => !!x && typeof x.name === 'string' &&
          typeof x.score === 'number' && x.score>=0 && x.score<=40));
      }}
    } catch {}
    Promise.all([
      fetch('/api/backend/api/v1/ielts/dashboard', {cache:'no-store'})
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/backend/api/v1/ielts/mistakes', {cache:'no-store'})
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([a,b]) => {
      if(a?.success && a.data) setDashboard(a.data);
      else setError('IELTS staging chưa kết nối; chưa có điểm và lịch sử đồng bộ.');
      if(b?.success && Array.isArray(b.data)) setRemoteMistakes(b.data);
    });
  }, []);

  function recordTest() {
    const numeric = Number(score);
    if(!testName.trim() || score.trim()==='' || !Number.isInteger(numeric) || numeric<0 || numeric>40) {
      setError('Nhập tên và điểm 0–40');return;
    }
    const next = [{name:testName.trim(),score:numeric},...tests];
    setTests(next);
    try {localStorage.setItem('albion_tracker_local_logs_v1',JSON.stringify(next));} catch {}
    setShowForm(false);setTestName('');setScore('');
  }

  const skill = (name: string) => {
    const current=dashboard.skillBands?.find(x=>x.skill===name)?.current;
    return current != null && current > 0 ? current.toFixed(1) : '—';
  };
  const stats = [
    ['READING BAND',skill('Reading'),'( /40)','Recent Reading sessions'],
    ['LISTENING BAND',skill('Listening'),'( /40)','Recent Listening sessions'],
    ['WRITING TRACKER',skill('Writing'),'Task 2 · trung bình','Chi tiết ở tab Writing'],
    ['SPEAKING LOG',skill('Speaking'),'Fluency','Chi tiết ở tab Speaking'],
  ];
  return <>
    <div className="hd">
      <div><div className="e">The Cambridge Ledger</div><h1>IELTS Tracker</h1></div>
      <div className="meta">Target Band: <b>7.5</b> · Exam Year: <b>2026</b></div>
    </div>
    <div className="row r4">
      {stats.map(([heading,value,note,hint])=><div className="box hv" key={heading}>
        <div className="band"><small>{heading}</small>{value}</div>
        <div className="sub" style={{fontSize:'.8rem'}}>{note}</div>
        <div className="tip">{hint}</div>
      </div>)}
    </div>
    <div className="row r55" style={{marginTop:22}}>
      <div className="box">
        <div className="meta">TEST LOGS</div>
        {dashboard.recentSessions?.map(s=><div className="li" key={s.id}>
          <span>• {s.title || s.section || 'IELTS session'}</span>
          <b>{s.score || (typeof s.rawScore==='number'?`${s.rawScore}/40`:'—')}
            {s.band != null?` · Band ${s.band.toFixed(1)}`:''}</b>
        </div>)}
        {tests.map((t,i)=><div className="li" key={`${t.name}-${i}`}>
          <span>• {t.name}</span><b>{t.score}/40 · Band {rawBand(t.score)}</b>
        </div>)}
        {showForm
          ? <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
              <input className="in" placeholder="Tên bài test" style={{flex:2}}
                value={testName} onChange={e=>setTestName(e.target.value)}/>
              <input className="in" type="number" min="0" max="40" placeholder="/40"
                style={{flex:1}} value={score} onChange={e=>setScore(e.target.value)}/>
              <button className="btn p" onClick={recordTest}>Lưu</button>
            </div>
          : <button className="btn" style={{marginTop:14}} onClick={()=>setShowForm(true)}>
              + Log New Test Result
            </button>}
        <div className="meta" style={{marginTop:10}}>Band ước tính theo thang Academic Reading.</div>
        <div className="meta">Log mới lưu trên trình duyệt; phiên từ Core hiển thị riêng.</div>
      </div>
      <div className="box">
        <div className="meta">MISTAKE LOGBOOK</div>
        {remoteMistakes.slice(0,3).map((m,i)=><div className="li" style={{display:'block'}} key={i}>
          <span className="tag">{m.category || m.mistakeCategory || 'IELTS'}</span>{' '}
          <b>{m.title || 'Mistake analysis'}</b>
          <div className="sub" style={{fontSize:'.85rem'}}>{m.rootCauseAnalysis || ''}</div>
        </div>)}
        <Link className="lnk" href="/ielts/mistakes" style={{display:'inline-block',marginTop:12}}>
          Mở sổ lỗi sai »
        </Link>
      </div>
    </div>
    {error && <p role="status" className="meta" style={{marginTop:16}}>{error}</p>}
  </>;
}
