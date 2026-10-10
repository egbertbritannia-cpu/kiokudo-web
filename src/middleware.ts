import { NextResponse, type NextRequest } from 'next/server';

/**
 * Retained only to redirect old login bookmarks to the Japanese home.
 * The Studio and IELTS pages no longer require application login.
 * Backend data access stays independently controlled by the BFF.
 */
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL('/', request.url), 307);
}

export const config = {
  matcher: ['/login'],
};
