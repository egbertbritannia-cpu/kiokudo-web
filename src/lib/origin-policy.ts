import type { NextRequest } from 'next/server';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Reject browser cross-site mutations. Next dev may normalize the incoming
 * loopback host to localhost even when the client used 127.0.0.1; only those
 * two exact loopback names are equivalent, and only in development.
 *
 * Public deployments must have an explicitly pinned HTTPS origin; do not
 * derive production trust from user-controlled Origin/Host alone.
 */
export function hasTrustedRequestOrigin(request: NextRequest): boolean {
  const originHeader = request.headers.get('origin');
  if (!originHeader || request.headers.get('sec-fetch-site') === 'cross-site') {
    return false;
  }
  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return false;
  }
  if (origin.origin !== originHeader || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash) return false;

  if (process.env.NODE_ENV === 'development') {
    const expected = request.nextUrl;
    return origin.protocol === 'http:' && expected.protocol === 'http:' &&
      LOOPBACK_HOSTS.has(origin.hostname) &&
      LOOPBACK_HOSTS.has(expected.hostname) &&
      origin.port === expected.port;
  }

  if (process.env.NODE_ENV === 'production') {
    const declared = process.env.KIOKUDO_WEB_PUBLIC_ORIGIN;
    if (!declared || !declared.startsWith('https://')) return false;
    try {
      const canonical = new URL(declared);
      return canonical.origin === declared &&
        canonical.protocol === 'https:' &&
        canonical.hostname.includes('.') &&
        !LOOPBACK_HOSTS.has(canonical.hostname) &&
        canonical.username === '' && canonical.password === '' &&
        canonical.pathname === '/' && !canonical.search && !canonical.hash &&
        originHeader === declared &&
        request.headers.get('host')?.toLowerCase() === canonical.host.toLowerCase();
    } catch {
      return false;
    }
  }
  return false;
}
