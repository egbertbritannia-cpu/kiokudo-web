import { NextRequest, NextResponse } from 'next/server';
import { sessionFromCookieHeader } from '@/lib/owner-auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): NextResponse {
  const authenticated = sessionFromCookieHeader(request.headers.get('cookie')) !== null;
  const ownerKey = sessionFromCookieHeader(request.headers.get('cookie'));
  return NextResponse.json({ authenticated, ownerKey }, {
    headers: { 'cache-control': 'private, no-store' },
  });
}
