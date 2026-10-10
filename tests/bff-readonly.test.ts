import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET, POST} from '../src/app/api/backend/[...path]/route.js';
import { createOwnerSession } from '../src/lib/owner-auth-server.js';

const token='test-service-token-with-more-than-24-characters';
const ctx=(...path:string[])=>({params:Promise.resolve({path})});
function req(method='GET',uri='http://localhost:3000/api/backend/api/v1/cards',headers?:Record<string,string>){
  const copy = new Headers(headers);
  // All ordinary positive staging reads carry a synthetic, signed owner cookie.
  const signed = createOwnerSession();
  copy.set('cookie', [copy.get('cookie'),'kiokudo_owner_session='+signed].filter(Boolean).join('; '));
  return new NextRequest(uri,{method,headers:copy});
}
async function withEnv(fn:()=>Promise<void>){
  const saved={
    NODE_ENV:process.env.NODE_ENV, KIOKUDO_STAGING_READ_ENABLED:process.env.KIOKUDO_STAGING_READ_ENABLED,
    KIOKUDO_OWNER_SUBJECT:process.env.KIOKUDO_OWNER_SUBJECT,
    KIOKUDO_SESSION_SECRET:process.env.KIOKUDO_SESSION_SECRET,
    KIOKUDO_INTERNAL_ASSERTION_KEY:process.env.KIOKUDO_INTERNAL_ASSERTION_KEY,
    KIOKUDO_LOGIN_PASSWORD_SCRYPT:process.env.KIOKUDO_LOGIN_PASSWORD_SCRYPT,
    KIOKUDO_REMOTE_STAGING_READ_ENABLED:process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED,
    KIOKUDO_CORE_URL:process.env.KIOKUDO_CORE_URL, KIOKUDO_CORE_SERVICE_TOKEN:process.env.KIOKUDO_CORE_SERVICE_TOKEN,
  };
  try{
    Object.assign(process.env, { NODE_ENV: 'development' });
    process.env.KIOKUDO_STAGING_READ_ENABLED='true';
    process.env.KIOKUDO_CORE_URL='http://127.0.0.1:4000';
    process.env.KIOKUDO_CORE_SERVICE_TOKEN=token;
    process.env.KIOKUDO_OWNER_SUBJECT='test_owner_alpha';
    process.env.KIOKUDO_SESSION_SECRET='fixture-session-key-not-a-deploy-secret-2026';
    process.env.KIOKUDO_INTERNAL_ASSERTION_KEY='fixture-core-key-not-a-deploy-secret-2026';
    process.env.KIOKUDO_LOGIN_PASSWORD_SCRYPT='fixture-test-hash-is-not-a-real-password';
    process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED='false';
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
      assert.match(new Headers(init?.headers).get('x-kiokudo-owner-assertion') ?? '', /^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{43}$/);
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

test('Phase4B BFF forwards only whitelisted Grammar and IELTS GETs',async()=>{
 await withEnv(async()=>{
  const old=globalThis.fetch;
  const seen:string[]=[];
  globalThis.fetch=async(url,init)=>{
    seen.push(String(url));
    assert.equal(init?.method,'GET');
    assert.equal(new Headers(init?.headers).get('authorization'),`Bearer ${token}`);
    return new Response(JSON.stringify({success:true,data:[]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
   for(const path of [
     ['grammar'],['grammar','practice'],['grammar','lesson8'],
     ['ielts','dashboard'],['ielts','materials'],['ielts','sessions'],
     ['ielts','sessions','session_123'],['ielts','vocab'],['ielts','mistakes'],
   ]){
     const params=['api','v1',...path];
     const r=await GET(req('GET','http://localhost:3000/api/backend/'+params.join('/')),ctx(...params));
     assert.equal(r.status,200,params.join('/'));
   }
   assert.equal(seen.length,9);
   const bad=await GET(req(),ctx('api','v1','ielts','admin'));
   assert.equal(bad.status,404);
   const hostile=await GET(req(),ctx('api','v1','grammar','..'));
   assert.equal(hostile.status,404);
   const write=await POST(req('POST'),ctx('api','v1','ielts','sessions'));
   assert.equal(write.status,405);
  }finally{globalThis.fetch=old;}
 });
});
