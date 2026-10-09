'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import './staging.css';

type Card = {
 id:string; kanji:string; reading:string|null; meaning:string; deckId:string;
 deckName:string|null; state:string; stability:number; due:string|null;
};
type Deck = {id:string;name:string};
type Summary = {id:string; name:string; totalCards:number; newCards:number; learnedCards:number; dueCards:number};
type CardsResponse = {success:boolean;data:Card[];decks:Deck[];deckSummaries:Summary[]};

export default function StagingCardsPage(){
  const [data,setData]=useState<CardsResponse|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [deck,setDeck]=useState('all');
  useEffect(()=>{
    const ctrl=new AbortController();
    fetch('/api/backend/api/v1/cards?limit=1500',{cache:'no-store',signal:ctrl.signal})
      .then(async res=>{
        const body=await res.json();
        if(!res.ok || !body.success) throw new Error(body.error||'Không tải được Cards staging');
        setData(body as CardsResponse);
      })
      .catch(err=>{ if(err.name!=='AbortError')setError(err.message||'Backend chưa sẵn sàng'); })
      .finally(()=>setLoading(false));
    return ()=>ctrl.abort();
  },[]);
  const filtered=useMemo(()=>{
    if(!data)return [];
    const q=search.trim().toLowerCase();
    return data.data.filter(c=>(deck==='all'||c.deckId===deck) &&
      (!q||[c.kanji,c.reading,c.meaning].some(t=>(t||'').toLowerCase().includes(q))));
  },[data,deck,search]);

  return <main className="srs-inspector">
    <nav className="brand"><Link href="/" style={{color:'inherit',textDecoration:'none'}}>記 KIOKUDO</Link><span className="status">STAGING READ-ONLY</span></nav>
    <section className="hero" style={{padding:'40px 0 26px'}}>
      <div className="eyebrow">PHASE 3 · API BFF → KIOKUDO CORE</div>
      <h1>Thư viện <em>staging</em></h1>
      <p>Chỉ đọc từ API backend qua BFF local. Đây không phải tiến độ học trên Turso production và không có thao tác tạo/sửa/xóa thẻ.</p>
    </section>
    {loading && <p role="status">Đang kết nối Kiokudo Core staging…</p>}
    {error && <section className="notice" role="alert"><strong>Không thể đọc staging:</strong> {error}. Hãy cấu hình backend staging và bật quyền đọc local trong <code>.env.local</code>.</section>}
    {data && <>
      <div className="gallery" style={{marginBottom:24}}>
        <article className="preview" style={{minHeight:120}}>
          <span className="kind">Cards được tải</span><h2>{data.data.length}</h2><p>Từ API staging (không phải production)</p>
        </article>
        <article className="preview" style={{minHeight:120}}>
          <span className="kind">Bộ thẻ</span><h2>{data.decks.length}</h2><p>Danh sách deck trả về bởi Core</p>
        </article>
        <article className="preview" style={{minHeight:120}}>
          <span className="kind">Review event</span><h2>Không ghi</h2><p>Trang staging này chỉ thực hiện GET</p>
        </article>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:20}}>
        <label>Tìm kiếm <input aria-label="Tìm từ vựng" value={search} onChange={e=>setSearch(e.target.value)}
          style={{padding:10,marginLeft:8}} /></label>
        <label>Bộ thẻ <select aria-label="Lọc bộ thẻ" value={deck} onChange={e=>setDeck(e.target.value)}
          style={{padding:10,marginLeft:8}}>
          <option value="all">Tất cả</option>
          {data.decks.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select></label>
      </div>
      <p role="status" style={{color:'var(--sub)'}}>Hiển thị {filtered.length} thẻ. ID và trạng thái bên dưới lấy trực tiếp từ API.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:12}}>
        {filtered.map(card=><article className="preview" key={card.id} style={{minHeight:170,padding:20}}>
          <span className="kind">{card.deckName||card.deckId} · {card.state}</span>
          <h2 style={{margin:'10px 0 2px'}}>{card.kanji}</h2>
          <p style={{margin:'2px 0'}}>{card.reading}</p>
          <p>{card.meaning}</p>
          <small style={{fontSize:'.67rem',overflowWrap:'anywhere',color:'var(--sub)'}}>ID: {card.id}</small>
        </article>)}
      </div>
    </>}
    <footer style={{marginTop:30}}><Link href="/">Quay về gallery</Link> · Không có chức năng mutation / FSRS trong giao diện này.</footer>
  </main>;
}
