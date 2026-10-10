/**
 * Canonical destinations for the two learning systems.
 * Japanese studio keeps its existing hash router; IELTS uses Next.js routes.
 */
export const JAPANESE_HOME = '/#/';
export const IELTS_HOME = '/ielts';

export function isIeltsPath(pathname: string | null | undefined): boolean {
  return pathname === IELTS_HOME || Boolean(pathname?.startsWith(`${IELTS_HOME}/`));
}

/**
 * Translate only the retired Japanese-studio IELTS hashes.
 * Unsupported legacy subroutes safely open the IELTS dashboard.
 */
export function legacyIeltsHashToPath(hash: string): string | null {
  const route = hash.replace(/^#\/?/, '').split(/[?#]/, 1)[0];
  const [module, section] = route.split('/');
  // Support the original one-file Albion demo's #/en/* bookmarks, too.
  if (module === 'en') {
    const legacyPages = new Set(['tracker','writing','speaking','mistakes']);
    return section && legacyPages.has(section) ? `${IELTS_HOME}/${section}` : IELTS_HOME;
  }
  if (module !== 'ielts') return null;
  const canonicalPages = new Set(['session','review','tracker','writing','speaking','mistakes']);
  return section && canonicalPages.has(section)
    ? `${IELTS_HOME}/${section}`
    : IELTS_HOME;
}
