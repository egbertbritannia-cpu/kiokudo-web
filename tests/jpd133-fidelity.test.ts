import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getAllJPD133Slots } from '../src/core/curriculum/jpd133-manifest.js';

const originals = {
  'data/jpd133_vocab.json': '22e18bac5b96c938aaa595bde6c735503411d99e',
  'src/app/curriculum/jpd133/page.tsx': 'e46f712e2f6ebb7e3ab22ae89b6cb161a4fa55c3',
};
function gitSha(path:string){
 const b=readFileSync(path);
 return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
}
test('Curriculum source and visuals copied byte-for-byte from legacy', ()=>{
 for(const [file,sha] of Object.entries(originals)) assert.equal(gitSha(file),sha,file);
});
test('JPD133 curriculum remains manifest-driven with eight slots', ()=>{
 const slots=getAllJPD133Slots();
 assert.equal(slots.length,8);
 assert.ok(slots.every(s=>s.slotId.startsWith('jpd133-slot-')));
 assert.ok(slots.every(s=>Array.isArray(s.vocabularyList)));
});
