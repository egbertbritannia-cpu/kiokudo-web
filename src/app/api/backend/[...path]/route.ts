import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };
const allowlist = new Set([
  'api/v1/cards','api/v1/status',
  'api/v1/grammar','api/v1/grammar/practice',
  'api/v1/ielts/dashboard','api/v1/ielts/materials','api/v1/ielts/sessions',
  'api/v1/ielts/vocab','api/v1/ielts/mistakes',
]);
function isAllowedReadRoute(route:string):boolean {
  return allowlist.has(route) ||
    /^api\/v1\/grammar\/[A-Za-z0-9_-]{1,128}$/.test(route) ||
    /^api\/v1\/ielts\/sessions\/[A-Za-z0-9_-]{1,128}$/.test(route);
}

/**
 * Phase 3 local staging gateway — read-only only.
 * Remote/production access MUST remain disabled until web authentication is
 * independently configured and verified. Browser never receives core secret.
 */
function isLocalPreview(request: NextRequest): boolean {
  const host = request.nextUrl.hostname;
  return process.env.NODE_ENV === 'development'
    && (host === 'localhost' || host === '127.0.0.1')
    && process.env.KIOKUDO_STAGING_READ_ENABLED === 'true';
}
function validateCoreUrl(raw: string): URL {
  const u = new URL(raw);
  // Staging local preview permits only local core; public remote core deferred.
  if (u.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(u.hostname)
    || u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) {
    throw new Error('Only bare local HTTP core origin is allowed during Phase 3');
  }
  return u;
}
async function forward(request: NextRequest, context: Context): Promise<Response> {
  // Gate runs before even looking up the backend secret.
  if (!isLocalPreview(request)) {
    return Response.json({error:'staging_preview_disabled'}, {status:503});
  }
  if (request.method !== 'GET') {
    return Response.json({error:'method_not_allowed'}, {status:405});
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return Response.json({error:'forbidden_origin'}, {status:403});
  }
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site') {
    return Response.json({error:'forbidden_site'}, {status:403});
  }
  const {path} = await context.params;
  const route = Array.isArray(path) ? path.join('/') : '';
  if (!isAllowedReadRoute(route)) {
    return Response.json({error:'route_not_migrated'}, {status:404});
  }
  const raw = process.env.KIOKUDO_CORE_URL;
  const token = process.env.KIOKUDO_CORE_SERVICE_TOKEN;
  if (!raw || !token || token.length < 24 || token.startsWith('replace-')) {
    return Response.json({error:'backend_not_configured'}, {status:503});
  }
  let target:URL;
  try { target=validateCoreUrl(raw); }
  catch {return Response.json({error:'backend_url_invalid'}, {status:503});}
  target.pathname = '/' + route;
  target.search = request.nextUrl.search;
  const headers = new Headers({
    authorization: `Bearer ${token}`,
    accept:'application/json',
  });
  const requestId=request.headers.get('x-request-id');
  if (requestId) headers.set('x-request-id',requestId);

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
