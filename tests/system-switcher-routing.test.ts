import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IELTS_HOME,
  JAPANESE_HOME,
  isIeltsPath,
  legacyIeltsHashToPath,
} from '../src/lib/system-routes';

test('switcher destinations are canonical and mutually distinct', () => {
  assert.equal(JAPANESE_HOME, '/#/');
  assert.equal(IELTS_HOME, '/ielts');
  assert.notEqual(JAPANESE_HOME, IELTS_HOME);
});

test('IELTS routes are distinguished from Japanese and similarly named paths', () => {
  assert.equal(isIeltsPath('/ielts'), true);
  assert.equal(isIeltsPath('/ielts/session'), true);
  assert.equal(isIeltsPath('/ielts/review'), true);
  assert.equal(isIeltsPath('/'), false);
  assert.equal(isIeltsPath('/grammar'), false);
  assert.equal(isIeltsPath('/ielts-fake'), false);
  assert.equal(isIeltsPath(null), false);
});

test('old studio IELTS hashes resolve to real IELTS pages', () => {
  assert.equal(legacyIeltsHashToPath('#/ielts'), '/ielts');
  assert.equal(legacyIeltsHashToPath('#ielts'), '/ielts');
  assert.equal(legacyIeltsHashToPath('#/ielts/session'), '/ielts/session');
  assert.equal(legacyIeltsHashToPath('#/ielts/review'), '/ielts/review');
  assert.equal(legacyIeltsHashToPath('#/en'), '/ielts');
  assert.equal(legacyIeltsHashToPath('#/en/tracker'), '/ielts/tracker');
  assert.equal(legacyIeltsHashToPath('#/en/writing'), '/ielts/writing');
  assert.equal(legacyIeltsHashToPath('#/en/speaking'), '/ielts/speaking');
  assert.equal(legacyIeltsHashToPath('#/en/vocab'), '/ielts/vocab');
  assert.equal(legacyIeltsHashToPath('#/en/mistakes'), '/ielts/mistakes');
  assert.equal(legacyIeltsHashToPath('#/ielts/tracker'), '/ielts/tracker');
  assert.equal(legacyIeltsHashToPath('#/ielts/unknown'), '/ielts');
  assert.equal(legacyIeltsHashToPath('#/dobai'), null);
  assert.equal(legacyIeltsHashToPath('#/grammar'), null);
});
