import assert from 'node:assert/strict';

const origin='http://127.0.0.1:3000';
const api=origin+'/api/backend/api/v1/cards?limit=500';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

let ownerCookie='';
async function ownerFetch(url, init={}) {
  const headers=new Headers(init.headers);
  if(ownerCookie) headers.set('cookie',ownerCookie);
  return globalThis.fetch(url,{...init,headers});
}

async function loginToFixtureOwner() {
  const password=process.env.KIOKUDO_SMOKE_PASSWORD;
  if(!password)throw new Error('Missing CI-only KIOKUDO_SMOKE_PASSWORD');
  let last='not_started';
  for(let i=0;i<50;i++){
    try{
      const response=await globalThis.fetch(origin+'/api/auth/login',{
        method:'POST',
        headers:{origin,'content-type':'application/json'},
        body:JSON.stringify({password}),
        signal:AbortSignal.timeout(4500),
      });
      if(response.ok) {
        ownerCookie=(response.headers.get('set-cookie')||'').split(';')[0];
        assert.ok(ownerCookie.startsWith('kiokudo_owner_session='));
        return;
      }
      last='login HTTP '+response.status;
    }catch(e){last=String(e);}
    await sleep(1500);
  }
  throw new Error('Login fixture did not become ready: '+last);
}

await loginToFixtureOwner();
const anonymous=await globalThis.fetch(api);
assert.equal(anonymous.status,401,'unauthenticated BFF request must be refused');

async function waitForCards() {
  let last='';
  for(let i=0;i<50;i++){
    try{
      const response=await ownerFetch(api,{signal:AbortSignal.timeout(4500)});
      if(response.status===200){
        const data=await response.json();
        return {response,data};
      }
      last=`status ${response.status}: ${(await response.text()).slice(0,200)}`;
    }catch(e){last=String(e);}
    await sleep(1500);
  }
  throw new Error('Web → Core staging path never became ready: '+last);
}

const {response,data}=await waitForCards();
assert.equal(response.status,200);
assert.equal(data.success,true);
assert.equal(data.data.length,316,'Git source rehearsal must expose 316 cards');
assert.equal(data.decks.length,2);
assert.equal(data.deckSummaries.find(d=>d.id==='fixture_jpd133').totalCards,256);
assert.equal(data.deckSummaries.find(d=>d.id==='fixture_n5').totalCards,60);
assert.ok(data.data.some(c=>c.kanji==='父' && c.id.startsWith('fixture_')));
assert.equal(response.headers.get('cache-control'),'no-store');
console.log('PASS: Web BFF → Core returned 316 cards / 2 fixture decks');

const write=await ownerFetch(origin+'/api/backend/api/v1/reviews',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({eventId:'should-not-write',cardId:'fixture',rating:'Good'}),
});
assert.equal(write.status,405,'Web BFF must reject review writes');
const notAllowed=await ownerFetch(origin+'/api/backend/api/v1/reviews');
assert.equal(notAllowed.status,404,'Web BFF must reject unlisted reads');
const status=await ownerFetch(origin+'/api/backend/api/v1/status');
assert.equal(status.status,200);
assert.equal((await status.json()).reviewApiStagingReady,true);
console.log('PASS: BFF access gates reject writes and unlisted paths');

const page=await ownerFetch(origin+'/staging/cards');
assert.equal(page.status,200);
assert.ok((await page.text()).includes('STAGING READ-ONLY'));
console.log('PASS: staging UI route renders from Web app');

const stageGrammar=await ownerFetch(origin+'/api/backend/api/v1/grammar');
assert.equal(stageGrammar.status,200,'Grammar should be served through BFF');
assert.equal((await stageGrammar.json()).lessons[0].id,'ci_lesson8');
const stageLesson=await ownerFetch(origin+'/api/backend/api/v1/grammar/ci_lesson8');
assert.equal(stageLesson.status,200);
assert.equal((await stageLesson.json()).patterns[0].id,'ci_pattern');
const stageDrill=await ownerFetch(origin+'/api/backend/api/v1/grammar/practice?lessonId=ci_lesson8&limit=15');
assert.equal(stageDrill.status,200);
assert.equal((await stageDrill.json()).exercises[0].id,'ci_exercise');
const stageIELTS=await ownerFetch(origin+'/api/backend/api/v1/ielts/dashboard');
assert.equal(stageIELTS.status,200);
assert.equal((await stageIELTS.json()).data.currentBand,7.5);
const stageBooks=await ownerFetch(origin+'/api/backend/api/v1/ielts/materials');
assert.equal(stageBooks.status,200);
assert.equal((await stageBooks.json()).data[0].id,'ci_book');
const writes=await ownerFetch(origin+'/api/backend/api/v1/ielts/sessions',{method:'POST',
  headers:{'content-type':'application/json'},body:'{}'});
assert.equal(writes.status,405,'IELTS persistence remains blocked');
const grammarView=await ownerFetch(origin+'/grammar',{signal:AbortSignal.timeout(30000)});
assert.equal(grammarView.status,200,'Original Grammar page should render with Core data');
assert.ok((await grammarView.text()).includes('CI Bài 8'));
const ieltsView=await ownerFetch(origin+'/ielts',{signal:AbortSignal.timeout(30000)});
assert.equal(ieltsView.status,200);
assert.ok((await ieltsView.text()).includes('The Study'));
console.log('PASS CI ONLY: Grammar + IELTS API and original routes render through two real servers');
