import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const legacyBlobs = {
  'src/app/page.tsx': 'dadabd4f43a27f42697c01b685a36aa7ea12a15f',
  'src/app/globals.css': '418aa820b635d0bc60a1060c8ec76b83cbd31fe8',
  'src/app/culture/page.tsx': 'a78b59d07826e58294cd77568d0e2fdd6217af75',
  'src/app/review/dobai/page.tsx': '61519719fbd8930ba0bc33867e7fcc335d8e47be',
  'src/components/navigation/KiokudoNavBar.tsx': 'b1a6a93b007791379a674259b1b54b880e6d6555',
  'public/assets/art/art-manifest.json': '1024517b588c8d98a5ca2f080d60feab8f3c2e81',
  'public/assets/art/hokusai-suwa-lake.jpg': '42f18b85d2103047bcc4d2a237224ffc4196ee46',
  'public/assets/art/japanese-cultural-panorama.jpg': 'adca8dab24dc88dc1a8fee2a4d134b672ff1f078',
} as const;

function gitBlobHash(buf:Buffer):string {
  return createHash('sha1')
    .update(Buffer.from(`blob ${buf.byteLength}\0`))
    .update(buf).digest('hex');
}

test('main Kiokudo artwork, Studio JSX and CSS are byte-for-byte identical to legacy commit', ()=>{
  for (const [path, expected] of Object.entries(legacyBlobs)) {
    assert.ok(existsSync(path),`Missing original Kiokudo asset: ${path}`);
    const actual=gitBlobHash(readFileSync(path));
    assert.equal(actual,expected,`Design asset changed from legacy: ${path}`);
  }
});

test('functional Cards UI reads staging BFF, not legacy monolith API', ()=>{
  const cards=readFileSync('src/app/cards/page.tsx','utf8');
  assert.ok(cards.includes('/api/backend/api/v1/cards?limit=1000'));
  assert.ok(!cards.includes("fetch('/api/cards?limit=1000')"));
  assert.ok(cards.includes('Quản lý thẻ học tiếng Nhật'));
});

test('new Review UI cannot submit a grade or queue a false review event', ()=>{
  const review=readFileSync('src/app/review/page.tsx','utf8');
  assert.ok(!review.includes("fetch('/api/review'"));
  assert.ok(!review.includes('recordPendingReview(currentCard.id'));
  assert.ok(review.includes('chấm điểm FSRS chưa được kích hoạt'));
  assert.ok(review.includes('/api/backend/api/v1/cards'));
});
