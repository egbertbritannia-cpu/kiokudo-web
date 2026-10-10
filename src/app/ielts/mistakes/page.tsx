'use client';

import { useEffect, useState } from 'react';

const SECTIONS=['Reading','Listening','Writing','Speaking'] as const;
type Mistake = { id?: string; category:string; title:string; note:string; local:boolean };

export default function AlbionMistakeLogbook(){
  const [filter,setFilter]=useState('All');
  const [mistakes,setMistakes]=useState<Mistake[]>([]);
  const [skill,setSkill]=useState<string>('Reading');
  const [title,setTitle]=useState('');
  const [note,setNote]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    let local:Mistake[]=[];
    try{
      const raw=localStorage.getItem('albion_local_mistakes_v1');
      if(raw){const data:unknown=JSON.parse(raw);
        if(Array.isArray(data))local=data.filter((x):x is Mistake=>
          !!x && typeof x.category==='string' && typeof x.title==='string' && x.local===true);
      }
    }catch{}
    setMistakes(local);
    fetch('/api/backend/api/v1/ielts/mistakes',{cache:'no-store'})
      .then(x=>x.ok?x.json():null)
      .then(json=>{
        if(json?.success && Array.isArray(json.data)){
          const upstream:Mistake[]=json.data.map((x:{
            id?:string; mistakeCategory?:string; category?:string;
            title?:string; rootCauseAnalysis?:string; note?:string;
          })=>({
            id:x.id, category:x.mistakeCategory||x.category||'Reading',
            title:x.title||x.mistakeCategory||'Mistake analysis',
            note:x.rootCauseAnalysis||x.note||'',local:false,
          }));
          // Keep the latest local edits even when this request resolves after
          // the user added or deleted an entry while Core was loading.
          setMistakes(current=>[...upstream,...current.filter(item=>item.local)]);
        }
      }).catch(()=>{});
  },[]);

  const filtered=mistakes.filter(x=>filter==='All'||x.category===filter);

  function saveLocal(){
    if(!title.trim()){setNotice('Nhập tiêu đề lỗi');return;}
    const next=[{category:skill,title:title.trim(),note:note.trim(),local:true},...mistakes];
    setMistakes(next);setTitle('');setNote('');setNotice('Đã lưu vào thiết bị.');
    try{localStorage.setItem('albion_local_mistakes_v1',JSON.stringify(next.filter(x=>x.local)));}catch{}
  }

  function removeLocal(i:number){
    const record=filtered[i];if(!record?.local)return;
    const at=mistakes.indexOf(record);
    const next=mistakes.filter((_,index)=>index!==at);setMistakes(next);
    try{localStorage.setItem('albion_local_mistakes_v1',JSON.stringify(next.filter(x=>x.local)));}catch{}
  }

  useEffect(()=>{
    if(!notice)return;
    const timer=window.setTimeout(()=>setNotice(''),2700);
    return ()=>window.clearTimeout(timer);
  },[notice]);

  return <>
    <div className="hd">
      <div><div className="e">The Errata Book</div><h1>Mistake Logbook</h1></div>
      <div className="meta"><b>{mistakes.length}</b> entries</div>
    </div>
    <div style={{marginBottom:16}}>
      {['All',...SECTIONS].map(c=><button key={c} className={`chip ${filter===c?'on':''}`}
        onClick={()=>setFilter(c)}>{c}</button>)}
    </div>
    <div className="row r55">
      <div className="box">
        <div className="meta">LOGBOOK</div>
        {filtered.length?filtered.map((m,i)=><div className="li" style={{display:'block'}} key={m.id||`${m.title}-${i}`}>
          <span className="tag">{m.category}</span>{' '}<b>{m.title}</b>
          {m.local&&<button className="lnk" onClick={()=>removeLocal(i)}
            style={{float:'right',color:'var(--sub)'}}>Delete</button>}
          <br/><span className="sub" style={{fontSize:'.85rem'}}>{m.note}</span>
        </div>):<span className="sub">Chưa có lỗi nào trong mục này.</span>}
      </div>
      <div className="box">
        <div className="meta">LOG A MISTAKE</div>
        <label className="l" htmlFor="albion-mc">Skill</label>
        <select className="sel" id="albion-mc" value={skill} onChange={e=>setSkill(e.target.value)}>
          {SECTIONS.map(s=><option key={s}>{s}</option>)}
        </select>
        <label className="l" htmlFor="albion-mt">Title</label>
        <input className="in" id="albion-mt" placeholder="e.g. Matching headings"
          value={title} onChange={e=>setTitle(e.target.value)}/>
        <label className="l" htmlFor="albion-mn">Note</label>
        <textarea className="in" id="albion-mn" rows={3} placeholder="Nguyên nhân, cách tránh…"
          value={note} onChange={e=>setNote(e.target.value)}/>
        <button className="btn p" style={{marginTop:16}} onClick={saveLocal}>Add to logbook</button>
      </div>
    </div>
    {notice&&<div className="toast" role="status">{notice}</div>}
  </>;
}
