import assert from 'node:assert/strict';

const origin='http://127.0.0.1:3000';
const api=origin+'/api/backend/api/v1/cards?limit=500';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitForCards() {
  let last='';
  for(let i=0;i<50;i++){
    try{
      const response=await fetch(api,{signal:AbortSignal.timeout(4500)});
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

const write=await fetch(origin+'/api/backend/api/v1/reviews',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({eventId:'should-not-write',cardId:'fixture',rating:'Good'}),
});
assert.equal(write.status,405,'Web BFF must reject review writes');
const notAllowed=await fetch(origin+'/api/backend/api/v1/reviews');
assert.equal(notAllowed.status,404,'Web BFF must reject unlisted reads');
const status=await fetch(origin+'/api/backend/api/v1/status');
assert.equal(status.status,200);
assert.equal((await status.json()).reviewApiStagingReady,true);
console.log('PASS: BFF access gates reject writes and unlisted paths');

const page=await fetch(origin+'/staging/cards');
assert.equal(page.status,200);
assert.ok((await page.text()).includes('STAGING READ-ONLY'));
console.log('PASS: staging UI route renders from Web app');
