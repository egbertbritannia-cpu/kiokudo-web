import { hasTrustedRequestOrigin } from '@/lib/origin-policy';
import type { NextRequest } from 'next/server';
import { isAllowedReadQuery, isAllowedReadRoute } from '@/lib/bff-read-policy';
import { sessionFromCookieHeader, signCoreOwnerAssertion } from '@/lib/owner-auth-server';
import { loginlessOwnerForHost } from '@/lib/loginless-access';
import { isStagingReadEnabled, stagingCoreOrigin } from '@/lib/staging-core-origin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };
/** Authenticated BFF for retained learning modules only. */
function isAllowedStagingRead(request: NextRequest): boolean {
  return isStagingReadEnabled(request.nextUrl.hostname);
}
// An explicit server-only opt-in is required for every mutation, in addition to
// Core's independent write flag, signed principal and verified staging marker.
function isAllowedStagingWrite(method: string, route: string): boolean {
  if (process.env.KIOKUDO_WEB_STAGING_WRITES_ENABLED !== 'true') return false;
  if (method === 'POST') {
    if (['api/v1/grammar/practice/attempts',
      'api/v1/ielts/sessions','api/v1/ielts/mistakes','api/v1/ielts/vocab'].includes(route)) return true;
    if (/^api\/v1\/ielts\/sessions\/[A-Za-z0-9_-]{1,128}\/submit$/.test(route)) return true;
  }
  return method === 'PUT' && (
    /^api\/v1\/ielts\/sessions\/[A-Za-z0-9_-]{1,128}\/(draft|score)$/.test(route) ||
    /^api\/v1\/ielts\/mistakes\/[A-Za-z0-9_-]{1,128}$/.test(route)
  );
}
async function forward(request: NextRequest, context: Context): Promise<Response> {
  // Gate runs before even looking up the backend secret.
  if (!isAllowedStagingRead(request)) {
    return Response.json({error:'staging_preview_disabled'}, {status:503});
  }
  const isRead = request.method === 'GET';
  if (!isRead && !['POST','PUT'].includes(request.method)) {
    return Response.json({error:'method_not_allowed'}, {status:405});
  }
  if (!isRead && !hasTrustedRequestOrigin(request)) {
    return Response.json({error:'forbidden_origin'}, {status:403});
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
  if (isRead ? !isAllowedReadRoute(route) : !isAllowedStagingWrite(request.method,route)) {
    return Response.json({error:isRead?'route_not_migrated':'staging_write_disabled'}, {status:isRead?404:403});
  }
  if (isRead ? !isAllowedReadQuery(route, request.nextUrl.search) : Boolean(request.nextUrl.search)) {
    return Response.json({error:'invalid_query'}, {status:400});
  }
  // A real signed owner session still works, but is no longer necessary for local
  // development or an operator-verified private deployment (never public by default).
  const owner = sessionFromCookieHeader(request.headers.get('cookie')) ??
    loginlessOwnerForHost(request.nextUrl.hostname);
  if (!owner) {
    return Response.json({error:'private_data_access_disabled'}, {
      status:403,headers:{'cache-control':'no-store'},
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
    assertion = signCoreOwnerAssertion(owner, request.method, target.pathname + target.search);
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
    let body: string | undefined;
    if (!isRead) {
      if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
        return Response.json({error:'unsupported_media_type'}, {status:415});
      }
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 128_000) {
        return Response.json({error:'body_too_large'}, {status:413});
      }
      try { const parsed = JSON.parse(body); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bad'); }
      catch { return Response.json({error:'invalid_json_body'}, {status:400}); }
      headers.set('content-type','application/json');
    }
    const upstream=await fetch(target.toString(),{
      method:request.method,headers,body,cache:'no-store',
      redirect:'manual',signal:AbortSignal.timeout(15000),
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
