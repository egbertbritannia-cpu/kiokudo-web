'use client';

import { useEffect, useState } from 'react';

/* Original Albion HTML's editorial word examples. Never represented as user
 * saved vocabulary or FSRS progress. Real saved words take precedence.
 */
type Word = {
  id:string; word:string; phonetic:string; partOfSpeech:string;
  meaning:string; definition:string; collocation:string; example:string;
};
const REFERENCE_WORDS:Word[] = [
  {id:'sample-ameliorate',word:'ameliorate',phonetic:'/əˈmiːliəreɪt/',partOfSpeech:'v.',meaning:'cải thiện, làm dịu bớt',definition:'make something bad better',collocation:'ameliorate poverty',example:'Aid can ameliorate living conditions.'},
  {id:'sample-ubiquitous',word:'ubiquitous',phonetic:'/juːˈbɪkwɪtəs/',partOfSpeech:'adj.',meaning:'có mặt khắp nơi',definition:'seeming to be everywhere',collocation:'ubiquitous technology',example:'Smartphones are now ubiquitous.'},
  {id:'sample-mitigate',word:'mitigate',phonetic:'/ˈmɪtɪɡeɪt/',partOfSpeech:'v.',meaning:'giảm nhẹ',definition:'make less severe',collocation:'mitigate the impact',example:'Trees mitigate urban heat.'},
  {id:'sample-plausible',word:'plausible',phonetic:'/ˈplɔːzəbl/',partOfSpeech:'adj.',meaning:'hợp lý, đáng tin',definition:'seeming reasonable or likely',collocation:'a plausible explanation',example:'His excuse sounds plausible.'},
  {id:'sample-ambiguous',word:'ambiguous',phonetic:'/æmˈbɪɡjuəs/',partOfSpeech:'adj.',meaning:'mơ hồ, nhập nhằng (như 曖昧)',definition:'open to more than one meaning',collocation:'an ambiguous statement',example:'The ending is deliberately ambiguous.'},
  {id:'sample-scrutinise',word:'scrutinise',phonetic:'/ˈskruːtənaɪz/',partOfSpeech:'v.',meaning:'xem xét kỹ lưỡng',definition:'examine very carefully',collocation:'scrutinise the data',example:'Examiners scrutinise every answer.'},
];

export default function AlbionVocab() {
  // This recreates the original HTML's Lexicon presentation. No FSRS, grading
  // API, card CRUD or SRS queue is involved in this English-only word preview.
  const [words,setWords]=useState<Word[]>(REFERENCE_WORDS);
  const [index,setIndex]=useState(0);
  const [revealed,setRevealed]=useState(false);

  useEffect(()=>{
    fetch('/api/backend/api/v1/ielts/vocab',{cache:'no-store'})
      .then(res=>res.ok?res.json():null)
      .then(json=>{
        if(json?.success&&Array.isArray(json.data)&&json.data.length){
          const source:Word[]=json.data.filter((x:{word?:unknown})=>typeof x.word==='string')
            .map((v:{
              id?:string;word:string;phonetic?:string;partOfSpeech?:string;
              primaryMeaning?:string;meaning?:string;definition?:string;
              collocation?:string;contextSentence?:string;
            },i:number)=>({
              id:v.id||String(i),word:v.word,phonetic:v.phonetic||'',
              partOfSpeech:v.partOfSpeech||'',meaning:v.primaryMeaning||v.meaning||'',
              definition:v.definition||'',collocation:v.collocation||'',
              example:v.contextSentence||'',
            }));
          if(source.length){setWords(source);setIndex(0);setRevealed(false);}
        }
      }).catch(()=>{});
  },[]);

  function next(repeat:boolean) {
    if(!revealed||index>=words.length)return;
    if(repeat)setWords(prev=>[...prev,prev[index]]);
    setIndex(i=>i+1);
    setRevealed(false);
  }

  useEffect(()=>{
    function keys(e:KeyboardEvent) {
      const target=e.target as HTMLElement | null;
      if(target?.closest('button,input,textarea,select,[contenteditable="true"]'))return;
      if(e.key===' '&&!revealed){e.preventDefault();setRevealed(true);}
      else if(e.key==='1'&&revealed)next(true);
      else if(e.key==='2'&&revealed)next(false);
    }
    document.addEventListener('keydown',keys);
    return ()=>document.removeEventListener('keydown',keys);
  });

  if(index>=words.length)return <div className="kt box fr" style={{textAlign:'center',padding:'50px 20px'}}>
    <div className="jp" style={{font:'700 3rem var(--mincho)',color:'var(--shu)'}}>Fin.</div>
    <h1>Đã ôn {words.length} từ học thuật</h1>
    <button className="btn p" style={{marginTop:14}} onClick={()=>{setWords(REFERENCE_WORDS);setIndex(0);setRevealed(false);}}>Ôn lại</button>
  </div>;

  const w=words[index];
  return <div className="kt">
    <div className="hd">
      <div><div className="e">The Lexicon</div><h1>Academic Vocabulary</h1></div>
      <div className="meta"><b>{index+1}</b> / {words.length}</div>
    </div>
    <div className="bar" style={{marginBottom:22}}>
      <i style={{width:`${index/words.length*100}%`}}/>
    </div>
    <div className="tile">
      <div className="c">A</div>
      <div className="meta">{revealed?'[DEFINITION]':'[WORD]'}</div>
      <div className="k" style={{marginTop:26,fontSize:'3rem'}}>{w.word}</div>
      <div className="kana">{w.phonetic} · {w.partOfSpeech}</div>
      {revealed
        ? <>
            <div style={{marginTop:16,fontWeight:600}}>{w.meaning}</div>
            <div className="sub" style={{fontSize:'.9rem'}}>{w.definition}</div>
            <div className="two">
              <div><small>COLLOCATION</small>{w.collocation}</div>
              <div><small>LEVEL</small>Band 7+</div>
            </div>
            <div className="ctx">{w.example}</div>
          </>
        : <>
            <p className="sub" style={{marginTop:70}}>Nhớ nghĩa trong đầu, rồi bấm Space.</p>
            <button className="btn" style={{marginTop:18}} onClick={()=>setRevealed(true)}>Reveal (Space)</button>
          </>}
    </div>
    <div className="gr">
      <button className="a" type="button" disabled={!revealed} onClick={()=>next(true)}>
        AGAIN<small>Key 1</small>
      </button>
      <button type="button" disabled={!revealed} onClick={()=>next(false)}>
        GOOD<small>Key 2</small>
      </button>
    </div>
  </div>;
}
