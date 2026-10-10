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
  const [words,setWords]=useState<Word[]>(REFERENCE_WORDS);
  const [index,setIndex]=useState(0);
  const [fromCore,setFromCore]=useState(false);
  useEffect(()=>{
    fetch('/api/backend/api/v1/ielts/vocab',{cache:'no-store'})
      .then(res=>res.ok?res.json():null)
      .then(json=>{
        if(json?.success&&Array.isArray(json.data)&&json.data.length){
          const source:Word[] = json.data.filter((x:{word?:unknown})=>typeof x.word==='string')
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
          if(source.length){setWords(source);setIndex(0);setFromCore(true);}
        }
      }).catch(()=>{});
  },[]);

  const word=words[index];
  if(!word)return null;
  return <div className="kt">
    <div className="hd">
      <div><div className="e">The Lexicon</div><h1>Academic Vocabulary</h1></div>
      <div className="meta"><b>{index+1}</b> / {words.length}</div>
    </div>
    <div className="bar" style={{marginBottom:22}}>
      <i style={{width:`${(index+1)/words.length*100}%`}}/>
    </div>
    <div className="tile">
      <div className="c">A</div>
      <div className="meta">[WORD]</div>
      <div className="k" style={{marginTop:26,fontSize:'3rem'}}>{word.word}</div>
      <div className="kana">{word.phonetic} · {word.partOfSpeech}</div>
      <div style={{marginTop:16,fontWeight:600}}>{word.meaning}</div>
      <div className="sub" style={{fontSize:'.9rem'}}>{word.definition}</div>
      <div className="two">
        <div><small>COLLOCATION</small>{word.collocation||'—'}</div>
        <div><small>LEVEL</small>Band 7+</div>
      </div>
      <div className="ctx">{word.example||'—'}</div>
    </div>
    <div className="gr">
      <button type="button" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>
        PREVIOUS<small>Browse words</small>
      </button>
      <button type="button" onClick={()=>setIndex(i=>(i+1)%words.length)}>
        NEXT<small>Browse words</small>
      </button>
    </div>
    {!fromCore&&<p className="meta" style={{marginTop:14}}>Ví dụ từ vựng theo bản thiết kế Albion; không phải tiến độ đã lưu.</p>}
  </div>;
}
