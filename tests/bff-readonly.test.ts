import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET, POST} from '../src/app/api/backend/[...path]/route.js';

const token='test-service-token-with-more-than-24-characters';
const ctx=(...path:string[])=>({params:Promise.resolve({path})});
function req(method='GET',uri='http://localhost:3000/api/backend/api/v1/cards',headers?:Record<string,string>){
  return new NextRequest(uri,{method,headers});
}
async function withEnv(fn:()=>Promise<void>){
  const saved={
    NODE_ENV:process.env.NODE_ENV, KIOKUDO_STAGING_READ_ENABLED:process.env.KIOKUDO_STAGING_READ_ENABLED,
    KIOKUDO_CORE_URL:process.env.KIOKUDO_CORE_URL, KIOKUDO_CORE_SERVICE_TOKEN:process.env.KIOKUDO_CORE_SERVICE_TOKEN,
  };
  try{
    Object.assign(process.env, { NODE_ENV: 'development' });
    process.env.KIOKUDO_STAGING_READ_ENABLED='true';
    process.env.KIOKUDO_CORE_URL='http://127.0.0.1:4000';
    process.env.KIOKUDO_CORE_SERVICE_TOKEN=token;
    await fn();
  }finally{
    for(const [key,value] of Object.entries(saved)) {
      if(value===undefined)delete process.env[key];
      else process.env[key]=value;
    }
  }
}
test('BFF refuses remote production/previews regardless of token',async()=>{
  await withEnv(async()=>{
    const r=await GET(req('GET','https://web.example.com/api/backend/api/v1/cards'),ctx('api','v1','cards'));
    assert.equal(r.status,503);
    assert.equal((await r.json()).error,'staging_preview_disabled');
  });
});
test('BFF never forwards write methods or unknown paths',async()=>{
  await withEnv(async()=>{
    assert.equal((await POST(req('POST'),ctx('api','v1','reviews'))).status,405);
    assert.equal((await GET(req(),ctx('api','v1','reviews'))).status,404);
    assert.equal((await GET(req('GET',undefined,{'sec-fetch-site':'cross-site'}),ctx('api','v1','cards'))).status,403);
    assert.equal((await GET(req('GET',undefined,{origin:'https://attacker.example'}),ctx('api','v1','cards'))).status,403);
  });
});
test('BFF read-only GET forwards server token and omits browser credentials',async()=>{
  await withEnv(async()=>{
    const original=globalThis.fetch;
    let called=false;
    globalThis.fetch=async(url,init)=>{
      called=true;
      assert.equal(String(url),'http://127.0.0.1:4000/api/v1/cards?limit=10');
      assert.equal(new Headers(init?.headers).get('authorization'),`Bearer ${token}`);
      assert.equal(new Headers(init?.headers).get('cookie'),null);
      assert.equal(init?.method,'GET');
      return new Response(JSON.stringify({success:true,data:[{id:'fixture',kanji:'父'}],decks:[],deckSummaries:[]}),{
        status:200,headers:{'content-type':'application/json','set-cookie':'SECRET=oops'},
      });
    };
    try{
      const r=await GET(req('GET','http://localhost:3000/api/backend/api/v1/cards?limit=10',{cookie:'usercookie=value'}),ctx('api','v1','cards'));
      assert.equal(r.status,200);
      assert.equal(r.headers.get('set-cookie'),null);
      assert.equal(r.headers.get('cache-control'),'no-store');
      assert.equal((await r.json()).data[0].id,'fixture');
      assert.ok(called);
    }finally{globalThis.fetch=original;}
  });
});
test('BFF fails closed if missing service credential',async()=>{
  await withEnv(async()=>{
    delete process.env.KIOKUDO_CORE_SERVICE_TOKEN;
    const r=await GET(req(),ctx('api','v1','cards'));
    assert.equal(r.status,503);
  });
});
