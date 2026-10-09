/**
 * Explicit query contract for the local-only, read-only staging BFF.
 * This is defense in depth, NOT user authentication or write authorization.
 */
const allowedKeys: Record<string, ReadonlySet<string>> = {
  'api/v1/cards': new Set(['deck', 'search', 'limit']),
  'api/v1/grammar/practice': new Set(['lessonId', 'limit']),
  'api/v1/ielts/sessions': new Set(['limit']),
};

function hasControlCharacters(value: string): boolean {
  return [...value].some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function validLimit(value: string, maximum: number): boolean {
  return /^[1-9][0-9]{0,3}$/.test(value) && Number(value) <= maximum;
}

export function isAllowedReadQuery(route: string, search: string): boolean {
  if (search.length > 2048) return false;
  const params = new URLSearchParams(search);
  const allowed = allowedKeys[route] ?? new Set<string>();
  const seen = new Set<string>();

  for (const [key, value] of params) {
    if (!allowed.has(key) || seen.has(key)) return false;
    seen.add(key);

    if (key === 'limit') {
      const maximum = route === 'api/v1/cards' ? 2000
        : route === 'api/v1/grammar/practice' ? 200 : 100;
      if (!validLimit(value, maximum)) return false;
    } else if (key === 'lessonId') {
      if (value !== 'all' && !/^[A-Za-z0-9_-]{1,128}$/.test(value)) return false;
    } else if (key === 'deck') {
      if (!value || value.length > 128 || hasControlCharacters(value)) return false;
    } else if (key === 'search') {
      if (value.length > 256 || hasControlCharacters(value)) return false;
    }
  }
  return true;
}
