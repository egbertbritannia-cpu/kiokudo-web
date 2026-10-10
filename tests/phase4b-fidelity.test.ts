import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const exactLegacy={
  'src/components/grammar/PatternCard.tsx':'479da1f73420b40dd3d40afd6299921fa04ca495',
  'src/components/grammar/StructureDiagram.tsx':'055b1bace66d2ed97d0c79eb61c51a615565cb34',
};
test('Phase 4B original Grammar components remain byte-for-byte unchanged',()=>{
 for(const [path,sha] of Object.entries(exactLegacy)){
  const bytes=readFileSync(path);
  const actual=createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
  assert.equal(actual,sha,path);
 }
});
test('Grammar practice is local-only and does not manufacture synthetic FSRS cards',()=>{
 const code=readFileSync('src/app/grammar/practice/page.tsx','utf8');
 assert.ok(code.includes('/api/backend/api/v1/grammar/practice'));
 assert.ok(!code.includes("fetch('/api/review'"));
 assert.ok(!code.includes('grammar_cloze_${current.patternId}'));
});
test('IELTS read paths preserve design, with no active client writes or fabricated learner history',()=>{
 for(const path of ['src/app/ielts/page.tsx','src/app/ielts/session/page.tsx','src/app/ielts/review/page.tsx']){
  const code=readFileSync(path,'utf8');
  assert.ok(!code.includes("fetch('/api/ielts/"),path);
  assert.ok(!code.includes("method: 'POST'"),path);
  assert.ok(!code.includes("method: 'PATCH'"),path);
 }
 const dashboard=readFileSync('src/app/ielts/page.tsx','utf8');
 assert.ok(dashboard.includes('ALBION IELTS · THE READING ROOM'),
   'English Home must keep the user-supplied Albion HTML visual reference');
 assert.ok(!dashboard.includes('currentBand:8,currentBand:'),
   'Home must not show fabricated IELTS progress');
 const review=readFileSync('src/app/ielts/review/page.tsx','utf8');
 assert.ok(!review.includes('SAMPLE_QUESTIONS'));
 assert.ok(!review.includes('Precipitous'));
 assert.ok(review.includes('/api/backend/api/v1/ielts/'),'IELTS persistence must go through BFF');
});
