import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'kiokudo_owner_session';
const SUBJECT_FORMAT = /^[A-Za-z0-9_-]{3,64}$/;
const SESSION_LIFETIME = 12 * 60 * 60;

function decodeBase64Url(input: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error('invalid_base64');
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

async function validOwnerCookie(token: string | undefined): Promise<boolean> {
  const secret = process.env.KIOKUDO_SESSION_SECRET;
  const owner = process.env.KIOKUDO_OWNER_SUBJECT;
  if (!token || token.length > 1024 || !secret || secret.length < 32 ||
      secret.startsWith('replace-') || secret.startsWith('change-') ||
      !owner || !SUBJECT_FORMAT.test(owner)) return false;

  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
  try {
    const payloadBytes = decodeBase64Url(parts[0]);
    const signature = decodeBase64Url(parts[1]);
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify'],
    );
    const verified = await crypto.subtle.verify(
      'HMAC', key, signature, new TextEncoder().encode(parts[0]),
    );
    if (!verified) return false;
    const payload: unknown = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    const p = payload as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    return p.v === 1 && p.sub === owner &&
      typeof p.iat === 'number' && Number.isInteger(p.iat) &&
      typeof p.exp === 'number' && Number.isInteger(p.exp) &&
      p.iat <= now + 30 && p.exp > now && p.exp - p.iat === SESSION_LIFETIME;
  } catch {
    return false;
  }
}

/** Protect server and client pages, including views with offline IndexedDB caches. */
export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (await validOwnerCookie(cookie)) return NextResponse.next();
  const target = request.nextUrl.clone();
  target.pathname = '/login';
  target.search = '';
  return NextResponse.redirect(target, 307);
}

export const config = {
  matcher: ['/cards/:path*', '/review/:path*', '/grammar/:path*',
    '/ielts/:path*', '/staging/:path*'],
};
