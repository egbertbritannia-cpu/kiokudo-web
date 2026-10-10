/**
 * Strict, read-only route/query contract for the localhost staging BFF.
 *
 * This policy is not authentication. It must not be reused as permission to
 * forward POST/PUT/PATCH/DELETE or to expose a shared Core service token.
 */
const fixedRoutes = new Set<string>([
  'api/v1/cards',
  'api/v1/status',
  'api/v1/grammar',
  'api/v1/grammar/practice',
  'api/v1/ielts/dashboard',
  'api/v1/ielts/materials',
  'api/v1/ielts/sessions',
  'api/v1/ielts/vocab',
  'api/v1/ielts/mistakes',
  'api/v1/curriculum/jpd133/mappings',
]);

const idPattern = /^[A-Za-z0-9_-]{1,128}$/;

const allowedKeys: Record<string, ReadonlySet<string>> = {
  'api/v1/cards': new Set(['deck', 'search', 'limit']),
  'api/v1/grammar/practice': new Set(['lessonId', 'limit']),
  'api/v1/ielts/sessions': new Set(['limit']),
  'api/v1/curriculum/jpd133/mappings': new Set(['slot']),
};

function hasControlCharacters(value: string): boolean {
  return [...value].some(character => {
    const code = character.codePointAt(0)!;
    return code < 32 || (code >= 127 && code <= 159);
  });
}

function isLimit(value: string, max: number): boolean {
  return /^[1-9][0-9]{0,3}$/.test(value) && Number(value) <= max;
}

export function isAllowedReadRoute(route: string): boolean {
  if (fixedRoutes.has(route)) return true;
  if (route.startsWith('api/v1/grammar/')) {
    return idPattern.test(route.slice('api/v1/grammar/'.length));
  }
  if (route.startsWith('api/v1/ielts/sessions/')) {
    return idPattern.test(route.slice('api/v1/ielts/sessions/'.length));
  }
  return false;
}

export function isAllowedReadQuery(route: string, search: string): boolean {
  if (!isAllowedReadRoute(route) || search.length > 2048) return false;
  // URLSearchParams is forgiving of invalid '%' escapes; fail closed instead.
  if (/%(?![0-9A-Fa-f]{2})/.test(search)) return false;

  const params = new URLSearchParams(search);
  const permitted = allowedKeys[route];
  const seen = new Set<string>();

  for (const [key, value] of params) {
    if (!permitted?.has(key) || seen.has(key)) return false;
    if (hasControlCharacters(key) || hasControlCharacters(value) ||
        key.includes('\uFFFD') || value.includes('\uFFFD')) return false;
    seen.add(key);

    switch (key) {
      case 'limit': {
        const max = route === 'api/v1/cards' ? 2000
          : route === 'api/v1/grammar/practice' ? 200 : 100;
        if (!isLimit(value, max)) return false;
        break;
      }
      case 'slot':
        if (!['1','2','3','4','5','6','8','10'].includes(value)) return false;
        break;
      case 'lessonId':
        if (value !== 'all' && !idPattern.test(value)) return false;
        break;
      case 'deck':
        if (!value || value.length > 128) return false;
        break;
      case 'search':
        if (value.length > 256) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}
