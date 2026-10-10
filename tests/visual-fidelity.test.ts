import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const legacyBlobs = {
  'src/app/globals.css': '418aa820b635d0bc60a1060c8ec76b83cbd31fe8',
  'src/app/culture/page.tsx': 'a78b59d07826e58294cd77568d0e2fdd6217af75',
  'src/app/review/dobai/page.tsx': '61519719fbd8930ba0bc33867e7fcc335d8e47be',
  'public/assets/art/art-manifest.json': '1024517b588c8d98a5ca2f080d60feab8f3c2e81',
  'public/assets/art/hokusai-suwa-lake.jpg': '42f18b85d2103047bcc4d2a237224ffc4196ee46',
  'public/assets/art/japanese-cultural-panorama.jpg': 'adca8dab24dc88dc1a8fee2a4d134b672ff1f078',
} as const;

function gitBlobHash(buf:Buffer):string {
  return createHash('sha1')
    .update(Buffer.from(`blob ${buf.byteLength}\0`))
    .update(buf).digest('hex');
}

test('retained Kiokudo CSS, Culture, Dò bài and visual assets match legacy', ()=>{
  for (const [path, expected] of Object.entries(legacyBlobs)) {
    assert.ok(existsSync(path),`Missing original Kiokudo asset: ${path}`);
    const actual=gitBlobHash(readFileSync(path));
    assert.equal(actual,expected,`Design asset changed from legacy: ${path}`);
  }
});

test('decommissioned flashcard pages are absent, and core-learning views remain',()=>{
  for(const path of ['src/app/cards/new/page.tsx','src/app/cards/page.tsx',
    'src/app/review/page.tsx','src/app/staging/cards/page.tsx']){
    assert.equal(existsSync(path),false,'retired UI still present: '+path);
  }
  for(const path of ['src/app/grammar/page.tsx','src/app/curriculum/jpd133/[slot]/page.tsx',
    'src/app/ielts/page.tsx','src/app/review/dobai/page.tsx']){
    assert.equal(existsSync(path),true,'retained module missing: '+path);
  }
  const studio=readFileSync('src/app/page.tsx','utf8');
  const nav=readFileSync('src/components/navigation/KiokudoNavBar.tsx','utf8');
  assert.ok(!studio.includes("tab === 'karuta'"));
  assert.ok(!studio.includes("tab === 'cards'"));
  assert.ok(!studio.includes("tab === 'shodo'"));
  assert.ok(!nav.includes("href: '/#/cards'"));
  assert.ok(!nav.includes("href: '/#/karuta'"));
  assert.ok(!nav.includes("href: '/#/shodo'"));
});
