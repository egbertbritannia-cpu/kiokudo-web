import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'kiokudo_owner_session';
const MAX_SESSION_SECONDS = 12 * 60 * 60;
const SUBJECT_FORMAT = /^[A-Za-z0-9_-]{3,64}$/;

function configuredSecret(value: string | undefined): value is string {
  return typeof value === 'string' && value.length >= 32 &&
    !value.startsWith('replace-') && !value.startsWith('change-');
}

function currentSubject(): string | null {
  const subject = process.env.KIOKUDO_OWNER_SUBJECT;
  return subject && SUBJECT_FORMAT.test(subject) ? subject : null;
}

function signature(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value, 'utf8').digest('base64url');
}

function validSignature(value: string, provided: string, secret: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(provided)) return false;
  const expected = Buffer.from(signature(value, secret), 'utf8');
  const received = Buffer.from(provided, 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function validLoginConfig(): boolean {
  return Boolean(currentSubject() &&
    configuredSecret(process.env.KIOKUDO_SESSION_SECRET) &&
    configuredSecret(process.env.KIOKUDO_INTERNAL_ASSERTION_KEY) &&
    process.env.KIOKUDO_LOGIN_PASSWORD_SCRYPT);
}

/** Format: 32-character hex salt : 128-character hex scrypt output. */
export function verifyOwnerPassword(password: unknown): boolean {
  if (typeof password !== 'string' || password.length < 16 || password.length > 256 ||
      !validLoginConfig()) return false;
  const stored = process.env.KIOKUDO_LOGIN_PASSWORD_SCRYPT ?? '';
  if (!/^[a-fA-F0-9]{32}:[a-fA-F0-9]{128}$/.test(stored)) return false;
  const [salt, hex] = stored.split(':');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createOwnerSession(): string {
  if (!validLoginConfig()) throw new Error('owner_auth_not_configured');
  const now = Math.floor(Date.now() / 1000);
  const subject = currentSubject()!;
  const payload = Buffer.from(JSON.stringify({
    v: 1, sub: subject, iat: now, exp: now + MAX_SESSION_SECONDS,
  }), 'utf8').toString('base64url');
  return payload + '.' + signature(payload, process.env.KIOKUDO_SESSION_SECRET!);
}

export function verifyOwnerSession(value: string | undefined): string | null {
  const secret = process.env.KIOKUDO_SESSION_SECRET;
  const owner = currentSubject();
  if (!value || value.length > 1024 || !configuredSecret(secret) || !owner) return null;
  const parts = value.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
      !validSignature(parts[0], parts[1], secret)) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!data || typeof data !== 'object') return null;
    const p = data as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    return p.v === 1 && p.sub === owner &&
      typeof p.iat === 'number' && Number.isInteger(p.iat) &&
      typeof p.exp === 'number' && Number.isInteger(p.exp) &&
      p.iat <= now + 30 && p.exp > now &&
      p.exp - p.iat === MAX_SESSION_SECONDS ? owner : null;
  } catch {
    return null;
  }
}

export function sessionFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map(part => part.trim())
    .find(part => part.startsWith(SESSION_COOKIE + '='));
  if (!match) return null;
  try {
    return verifyOwnerSession(decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

/** Signed assertion bound to a precise method/path and a single owner. */
export function signCoreOwnerAssertion(
  subject: string, method: string, pathnameAndSearch: string,
): string {
  const secret = process.env.KIOKUDO_INTERNAL_ASSERTION_KEY;
  if (!configuredSecret(secret) || subject !== currentSubject() ||
      !/^(GET|HEAD)$/.test(method) || !pathnameAndSearch.startsWith('/api/v1/')) {
    throw new Error('core_owner_assertion_unavailable');
  }
  const payload = Buffer.from(JSON.stringify({
    v: 1, sub: subject, iss: 'kiokudo-web', aud: 'kiokudo-core',
    scope: 'read', method, path: pathnameAndSearch,
    exp: Math.floor(Date.now() / 1000) + 30,
  }), 'utf8').toString('base64url');
  return payload + '.' + signature(payload, secret);
}

export const OWNER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: MAX_SESSION_SECONDS,
};
