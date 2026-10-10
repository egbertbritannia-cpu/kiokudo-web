'use client';

import { useEffect, useState } from 'react';

const CUES = [
  'Describe a person who helped you',
  'Describe a place you visited recently',
  'Describe a book you enjoyed',
  'Describe a skill you want to learn',
] as const;
const CRITERIA = ['Fluency','Lexical Resource','Grammar','Pronunciation'] as const;
type Talk = { cue: string; duration: number; bands: number[] };
const average = (v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const half = (v:number)=>(Math.round(v*2)/2).toFixed(1);
const fmt = (v:number)=>`${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;

export default function AlbionSpeaking() {
  const [cueIndex,setCueIndex]=useState(0);
  const [seconds,setSeconds]=useState(120);
  const [running,setRunning]=useState(false);
  const [bands,setBands]=useState([6.5,6.5,6.5,6.5]);
  const [talks,setTalks]=useState<Talk[]>([]);
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    try {const raw=localStorage.getItem('albion_speaking_log_v1');
      if(raw){const data:unknown=JSON.parse(raw);
        if(Array.isArray(data))setTalks(data.filter((x):x is Talk=>
          !!x && typeof x.cue==='string' && typeof x.duration==='number' &&
          Array.isArray(x.bands) && x.bands.length===4));
      }
    }catch{}
  },[]);
  useEffect(()=>{
    if(!running)return;
    const id=window.setInterval(()=>setSeconds(prev=>{
      if(prev<=1){setRunning(false);return 0;}return prev-1;
    }),1000);
    return ()=>window.clearInterval(id);
  },[running]);

  function addTalk(){
    const next=[{cue:CUES[cueIndex],duration:120-seconds,bands},...talks];
    setTalks(next);setRunning(false);setSeconds(120);
    setNotice('Đã lưu buổi luyện nói trên thiết bị này.');
    try {localStorage.setItem('albion_speaking_log_v1',JSON.stringify(next));}catch{}
  }

  return <>
    <div className="hd">
      <div><div className="e">The Conversation Room</div><h1>Speaking Log<small>Part 2</small></h1></div>
    </div>
    <div className="row r2">
      <div className="box fr">
        <div className="meta">CUE CARD</div>
        <div className="jp" style={{font:'700 1.8rem/1.3 var(--mincho)',margin:'10px 0'}}>{CUES[cueIndex]}</div>
        <div className="sub" style={{fontSize:'.9rem'}}>
          You should say: who/what it was · when it happened · why it mattered, and explain how you felt.
        </div>
        <div className="big" style={{margin:'22px 0 10px',fontSize:'3.2rem'}}>{fmt(seconds)}</div>
        <div style={{textAlign:'center'}}>
          <button className="btn p" onClick={()=>setRunning(r=>!r)}>{running?'Pause':'Start'}</button>{' '}
          <button className="btn" onClick={()=>{setRunning(false);setSeconds(120);}}>Reset</button>{' '}
          <button className="btn" onClick={()=>{setRunning(false);setSeconds(120);setCueIndex(i=>(i+1)%CUES.length);}}>
            New card
          </button>
        </div>
      </div>
      <div className="box">
        <div className="meta">SELF-ASSESSMENT</div>
        {CRITERIA.map((c,i)=><div key={c}>
          <label className="l" htmlFor={`albion-speaking-${i}`}>{c}</label>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <input type="range" id={`albion-speaking-${i}`} min="5" max="9" step=".5"
              value={bands[i]} style={{flex:1}}
              onChange={e=>setBands(prev=>prev.map((x,j)=>j===i?Number(e.target.value):x))}/>
            <b>{bands[i].toFixed(1)}</b>
          </div>
        </div>)}
        <button className="btn p" style={{marginTop:16}} onClick={addTalk}>Log session</button>
      </div>
    </div>
    <div className="box" style={{marginTop:22}}>
      <div className="meta">SESSION LOG</div>
      {talks.length?talks.map((x,i)=><div className="li" key={i}>
        <span>{x.cue} <span className="sub">· {fmt(x.duration)}</span></span>
        <b>Band {half(average(x.bands))}</b>
      </div>):<span className="sub">Chưa có buổi luyện nào.</span>}
    </div>
    {notice&&<p className="meta" role="status">{notice}</p>}
  </>;
}
