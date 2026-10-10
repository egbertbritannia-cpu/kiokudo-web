import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path:string) => readFileSync(join(process.cwd(),path),'utf8');

test('English navbar matches the six sections and crest from the supplied Albion HTML', () => {
  const layout = source('src/app/ielts/layout.tsx');
  for (const label of ['Home','Tracker','Writing','Speaking','Vocab','Logbook']) {
    assert.ok(layout.includes(`label: '${label}'`), label);
  }
  assert.match(layout,/className="crest">A<\/span>ALBION/);
  assert.match(layout,/className="pill"/);
  assert.match(layout,/<SystemSwitcher \/>/);
});

test('The isolated Albion CSS preserves original palette, typefaces and panel geometry', () => {
  const css = source('src/app/ielts/albion.css');
  for (const expected of [
    '--paper:#F3ECDB', '--card:#FBF7EC', '--ink:#1B2A22',
    '--shu:#7A1F2B', '--gold:#A8842F', 'background:#163425',
    'Cormorant Garamond', 'Be Vietnam Pro',
    'grid-template-columns:58fr 42fr',
    'grid-template-columns:60fr 40fr',
    'max-width:1120px', 'padding:98px 22px 120px',
  ]) assert.ok(css.includes(expected), expected);
  assert.ok(css.includes('#app .albion-ui h1'));
});

test('Every Albion section exists and keeps the reference screen heading', () => {
  for(const [route,heading] of [
    ['page.tsx','ALBION IELTS · THE READING ROOM'],
    ['tracker/page.tsx','The Cambridge Ledger'],
    ['writing/page.tsx','The Writing Desk'],
    ['speaking/page.tsx','The Conversation Room'],
    ['vocab/page.tsx','The Lexicon'],
    ['mistakes/page.tsx','The Errata Book'],
  ]) {
    assert.ok(source('src/app/ielts/'+route).includes(heading),route);
  }
});

test('Original design does not bring back deleted FSRS/card write endpoints',()=>{
  for(const route of ['page.tsx','tracker/page.tsx','writing/page.tsx',
    'speaking/page.tsx','vocab/page.tsx','mistakes/page.tsx']){
    const jsx = source('src/app/ielts/'+route);
    assert.doesNotMatch(jsx,/\/api\/v1\/(cards|reviews)/);
  }
});
