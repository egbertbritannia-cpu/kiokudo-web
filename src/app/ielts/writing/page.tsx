'use client';

import { useEffect, useState } from 'react';

const CRITERIA = ['Task Response', 'Coherence & Cohesion', 'Lexical Resource', 'Grammatical Range'] as const;
type Essay = { topic: string; bands: number[] };
const options = [5,5.5,6,6.5,7,7.5,8,8.5,9];
const average = (values:number[]) => values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const half = (value:number) => (Math.round(value*2)/2).toFixed(1);

export default function AlbionWriting() {
  const [essays,setEssays]=useState<Essay[]>([]);
  const [topic,setTopic]=useState('');
  const [bands,setBands]=useState<number[]>([6.5,6.5,6.5,6.5]);
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    try {
      const saved=localStorage.getItem('albion_essay_log_v1');
      if(saved){const value:unknown=JSON.parse(saved);
        if(Array.isArray(value))setEssays(value.filter((x):x is Essay=>
          !!x && typeof x.topic==='string' && Array.isArray(x.bands) &&
          x.bands.length===4 && x.bands.every((b:unknown)=>typeof b==='number' && b>=0 && b<=9)));
      }
    }catch{}
  },[]);

  function addEssay() {
    if(!topic.trim()){setNotice('Nhập chủ đề bài viết');return;}
    const next=[{topic:topic.trim(),bands},...essays];
    setEssays(next);setTopic('');setNotice('Đã lưu trên thiết bị này.');
    try {localStorage.setItem('albion_essay_log_v1',JSON.stringify(next));}catch{}
  }

  const averages=CRITERIA.map((_,i)=>average(essays.map(x=>x.bands[i])));
  const overall=essays.length?half(average(averages)):'—';

  return <>
    <div className="hd">
      <div><div className="e">The Writing Desk</div><h1>Writing Tracker<small>Task 2</small></h1></div>
      <div className="meta">Overall: <b>{overall}</b> · Target <b>7.5</b></div>
    </div>
    <div className="row r55">
      <div className="box">
        <div className="meta">AVERAGE BY CRITERION</div>
        <div className="acc">
          {CRITERIA.map((c,i)=><div key={c}>
            <span>{c}</span><div className="bar">
              <i style={{width:`${Math.max(0,(averages[i]-4)/5*100)}%`}}/>
            </div>
            <b>{essays.length?half(averages[i]):'—'}</b>
          </div>)}
        </div>
        <div className="meta" style={{marginTop:22}}>ESSAY LOG</div>
        {essays.map((x,i)=><div className="li" key={`${x.topic}-${i}`}>
          <span>{x.topic}</span><b>{half(average(x.bands))}</b>
        </div>)}
      </div>
      <div className="box">
        <div className="meta">LOG NEW ESSAY</div>
        <label className="l" htmlFor="albion-essay-topic">Topic</label>
        <input className="in" id="albion-essay-topic" placeholder="e.g. Remote work" value={topic}
          onChange={event=>setTopic(event.target.value)}/>
        <div className="row" style={{gridTemplateColumns:'1fr 1fr',gap:10}}>
          {CRITERIA.map((c,i)=><div key={c}>
            <label className="l" htmlFor={`albion-w-${i}`}>{c}</label>
            <select className="sel" id={`albion-w-${i}`} value={bands[i]} onChange={event=>
              setBands(prev=>prev.map((b,j)=>j===i?Number(event.target.value):b))}>
              {options.map(v=><option value={v} key={v}>{v.toFixed(1)}</option>)}
            </select>
          </div>)}
        </div>
        <button className="btn p" style={{marginTop:16}} onClick={addEssay}>Log essay</button>
      </div>
    </div>
    {notice&&<p className="meta" role="status">{notice}</p>}
  </>;
}
