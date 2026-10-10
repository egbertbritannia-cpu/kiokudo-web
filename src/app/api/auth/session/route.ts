import { NextRequest, NextResponse } from 'next/server';
import { sessionFromCookieHeader } from '@/lib/owner-auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): NextResponse {
  const authenticated = sessionFromCookieHeader(request.headers.get('cookie')) !== null;
  return NextResponse.json({ authenticated }, {
    headers: { 'cache-control': 'private, no-store' },
  });
}
