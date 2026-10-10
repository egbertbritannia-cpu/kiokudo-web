import { hasTrustedRequestOrigin } from '@/lib/origin-policy';
import type { NextRequest } from 'next/server';
import { isAllowedReadQuery, isAllowedReadRoute } from '@/lib/bff-read-policy';
import { sessionFromCookieHeader, signCoreOwnerAssertion } from '@/lib/owner-auth-server';
import { isStagingReadEnabled, stagingCoreOrigin } from '@/lib/staging-core-origin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };
/**
 * Phase 3 local staging gateway — read-only only.
 * Remote/production access MUST remain disabled until web authentication is
 * independently configured and verified. Browser never receives core secret.
 */
function isAllowedStagingRead(request: NextRequest): boolean {
  return isStagingReadEnabled(request.nextUrl.hostname);
}
async function forward(request: NextRequest, context: Context): Promise<Response> {
  // Gate runs before even looking up the backend secret.
  if (!isAllowedStagingRead(request)) {
    return Response.json({error:'staging_preview_disabled'}, {status:503});
  }
  if (request.method !== 'GET') {
    return Response.json({error:'method_not_allowed'}, {status:405});
  }
  const origin = request.headers.get('origin');
  if (origin && !hasTrustedRequestOrigin(request)) {
    return Response.json({error:'forbidden_origin'}, {status:403});
  }
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site') {
    return Response.json({error:'forbidden_site'}, {status:403});
  }
  const {path} = await context.params;
  // Validate each decoded segment; never permit encoded slashes or traversal.
  if (!Array.isArray(path) || path.some(segment => !/^[A-Za-z0-9_-]{1,128}$/.test(segment))) {
    return Response.json({error:'invalid_route'}, {status:400});
  }
  const route = path.join('/');
  if (!isAllowedReadRoute(route)) {
    return Response.json({error:'route_not_migrated'}, {status:404});
  }
  if (!isAllowedReadQuery(route, request.nextUrl.search)) {
    return Response.json({error:'invalid_query'}, {status:400});
  }
  const owner = sessionFromCookieHeader(request.headers.get('cookie'));
  if (!owner) {
    return Response.json({error:'authentication_required',loginUrl:'/login'}, {
      status:401,headers:{'cache-control':'no-store'},
    });
  }
  const raw = process.env.KIOKUDO_CORE_URL;
  const token = process.env.KIOKUDO_CORE_SERVICE_TOKEN;
  if (!raw || !token || token.length < 24 || token.startsWith('replace-')) {
    return Response.json({error:'backend_not_configured'}, {status:503});
  }
  let target:URL;
  try { target=stagingCoreOrigin(raw); }
  catch {return Response.json({error:'backend_url_invalid'}, {status:503});}
  target.pathname = '/' + route;
  target.search = request.nextUrl.search;
  let assertion: string;
  try {
    assertion = signCoreOwnerAssertion(owner, 'GET', target.pathname + target.search);
  } catch {
    return Response.json({error:'owner_auth_not_configured'}, {status:503});
  }
  const headers = new Headers({
    authorization: 'Bearer ' + token,
    'x-kiokudo-owner-assertion': assertion,
    accept:'application/json',
  });
  const requestId=request.headers.get('x-request-id');
  if (requestId && /^[A-Za-z0-9._-]{1,64}$/.test(requestId)) {
    headers.set('x-request-id', requestId);
  }

  try {
    const upstream=await fetch(target.toString(),{
      method:'GET',headers,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(15000),
    });
    if (upstream.status>=300 && upstream.status<400) {
      return Response.json({error:'upstream_redirect_refused'}, {status:502});
    }
    const ct=upstream.headers.get('content-type')||'';
    if (!ct.includes('application/json')) {
      return Response.json({error:'unexpected_content_type'}, {status:502});
    }
    return new Response(await upstream.arrayBuffer(),{
      status:upstream.status,
      headers:{'content-type':'application/json','cache-control':'no-store'},
    });
  }catch {
    return Response.json({error:'backend_unavailable'}, {status:502});
  }
}
export {forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE, forward as HEAD};
