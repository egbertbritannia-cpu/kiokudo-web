import { hasTrustedRequestOrigin } from '@/lib/origin-policy';
import { NextRequest, NextResponse } from 'next/server';
import { OWNER_COOKIE_OPTIONS, SESSION_COOKIE } from '@/lib/owner-auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }
  const response = NextResponse.json({ authenticated: false }, {
    headers: { 'cache-control': 'no-store' },
  });
  response.cookies.set(SESSION_COOKIE, '', { ...OWNER_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
