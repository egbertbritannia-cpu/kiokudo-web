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
  if (module !== 'ielts') return null;
  return section === 'session' || section === 'review'
    ? `${IELTS_HOME}/${section}`
    : IELTS_HOME;
}
