import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

describe('Kiokudo Web bootstrap invariants', () => {
  it('preserves surviving non-flashcard static demos', () => {
    for (const path of ['kiokudo-cultural-gate','ban-do-bai']) {
      assert.ok(existsSync(`public/ui-demos/${path}.html`));
    }
  });
  it('does not include a browser-published backend secret', () => {
    const source = readFileSync('src/app/api/backend/[...path]/route.ts','utf8');
    assert.ok(!source.includes('NEXT_PUBLIC_'));
    assert.ok(source.includes('KIOKUDO_CORE_SERVICE_TOKEN'));
  });
});
