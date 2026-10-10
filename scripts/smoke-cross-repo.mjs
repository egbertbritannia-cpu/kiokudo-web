import assert from 'node:assert/strict';

const origin='http://127.0.0.1:3000';
const grammar=origin+'/api/backend/api/v1/grammar';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ownerCookie='';

async function ownerFetch(url,init={}){
 const headers=new Headers(init.headers);
 if(ownerCookie)headers.set('cookie',ownerCookie);
 return globalThis.fetch(url,{...init,headers});
}
async function loginToFixtureOwner(){
 const password=process.env.KIOKUDO_SMOKE_PASSWORD;
 if(!password)throw new Error('Missing CI-only KIOKUDO_SMOKE_PASSWORD');
 let last='not_started';
 for(let i=0;i<50;i++){
  try{
   const r=await globalThis.fetch(origin+'/api/auth/login',{
    method:'POST',headers:{origin,'content-type':'application/json'},
    body:JSON.stringify({password}),signal:AbortSignal.timeout(4500),
   });
   if(r.ok){
    ownerCookie=(r.headers.get('set-cookie')||'').split(';')[0];
    assert.ok(ownerCookie.startsWith('kiokudo_owner_session='));
    return;
   }
   last='HTTP '+r.status;
  }catch(e){last=String(e)}
  await sleep(1500);
 }
 throw new Error('Owner login not ready: '+last);
}
await loginToFixtureOwner();
const anonymous=await globalThis.fetch(grammar);
assert.equal(anonymous.status,401,'private Grammar requires owner session');

let ready=null, last='';
for(let i=0;i<50;i++){
 try{
  const r=await ownerFetch(grammar,{signal:AbortSignal.timeout(4500)});
  if(r.ok){ready=await r.json();break;}
  last='HTTP '+r.status+' '+(await r.text()).slice(0,100);
 }catch(e){last=String(e)}
 await sleep(1500);
}
if(!ready)throw new Error('Web → Core Grammar staging not ready: '+last);
assert.equal(ready.lessons[0].id,'ci_lesson8');
assert.equal((await ownerFetch(origin+'/api/backend/api/v1/grammar/ci_lesson8')).status,200);
const exercises=await ownerFetch(origin+'/api/backend/api/v1/grammar/practice?lessonId=ci_lesson8&limit=15');
assert.equal(exercises.status,200);
assert.equal((await exercises.json()).exercises[0].id,'ci_exercise');

const ielts=await ownerFetch(origin+'/api/backend/api/v1/ielts/dashboard');
assert.equal(ielts.status,200);
assert.equal((await ielts.json()).data.currentBand,7.5);
const materials=await ownerFetch(origin+'/api/backend/api/v1/ielts/materials');
assert.equal(materials.status,200);
assert.equal((await materials.json()).data[0].id,'ci_book');

for(const route of ['cards','reviews','reviews/batch']){
 const r=await ownerFetch(origin+'/api/backend/api/v1/'+route);
 assert.equal(r.status,404,'retired flashcard endpoint must not be served: '+route);
}
const review=await ownerFetch(origin+'/api/backend/api/v1/reviews',{
 method:'POST',headers:{origin,'content-type':'application/json'},
 body:JSON.stringify({eventId:'removed',cardId:'card-a',rating:'Good'}),
});
assert.equal(review.status,403,'retired FSRS write must be denied by BFF');
const status=await ownerFetch(origin+'/api/backend/api/v1/status');
assert.equal(status.status,200);
assert.equal((await status.json()).flashcardApisAvailable,false);

const grammarPage=await ownerFetch(origin+'/grammar',{signal:AbortSignal.timeout(30000)});
assert.equal(grammarPage.status,200);
assert.ok((await grammarPage.text()).includes('CI Bài 8'));
const ieltsPage=await ownerFetch(origin+'/ielts',{signal:AbortSignal.timeout(30000)});
assert.equal(ieltsPage.status,200);
assert.ok((await ieltsPage.text()).includes('The Study'));
for(const retiredPage of ['/cards','/cards/new','/review','/staging/cards']){
 const r=await ownerFetch(origin+retiredPage,{signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,404,'retired UI route should no longer exist: '+retiredPage);
}
console.log('PASS: retained Grammar/IELTS reads work and retired flashcard routes return 404/403.');
