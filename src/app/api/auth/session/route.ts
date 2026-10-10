import { NextRequest, NextResponse } from 'next/server';
import { sessionFromCookieHeader } from '@/lib/owner-auth-server';
import { loginlessOwnerForHost } from '@/lib/loginless-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): NextResponse {
  const ownerKey = sessionFromCookieHeader(request.headers.get('cookie')) ??
    loginlessOwnerForHost(request.nextUrl.hostname);
  return NextResponse.json({
    authenticated: ownerKey !== null,
    ownerKey,
    loginRequired: false,
  }, {
    headers: { 'cache-control': 'private, no-store' },
  });
}
