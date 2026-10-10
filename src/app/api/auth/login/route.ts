import { hasTrustedRequestOrigin } from '@/lib/origin-policy';
import { NextRequest, NextResponse } from 'next/server';
import {
  createOwnerSession, OWNER_COOKIE_OPTIONS, SESSION_COOKIE, verifyOwnerPassword,
} from '@/lib/owner-auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const headers = { 'cache-control': 'no-store' };
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403, headers });
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json') ||
      Number(request.headers.get('content-length') ?? 0) > 1024) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 1024) throw new Error('oversized');
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers });
  }
  // Public serverless deployments require rate limiting at the trusted ingress.
  // Do not accept unlimited password guesses until the operator enables this guard.
  if (process.env.NODE_ENV === 'production' && process.env.KIOKUDO_PUBLIC_LOGIN_RATE_LIMIT_ACK !== 'true') {
    return NextResponse.json({ error: 'login_rate_limit_unconfigured' }, { status: 503, headers });
  }
  const password = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>).password : undefined;
  if (!await verifyOwnerPassword(password)) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401, headers });
  }
  let session: string;
  try {
    session = createOwnerSession();
  } catch {
    return NextResponse.json({ error: 'auth_not_configured' }, { status: 503, headers });
  }
  const response = NextResponse.json({ authenticated: true }, { headers });
  response.cookies.set(SESSION_COOKIE, session, OWNER_COOKIE_OPTIONS);
  return response;
}
