import { cookies } from 'next/headers';
import { signCoreOwnerAssertion, verifyOwnerSession, SESSION_COOKIE } from './owner-auth-server';
import { isStagingReadEnabled, stagingCoreOrigin } from './staging-core-origin';

/**
 * Server-only local staging Core reader, deliberately NOT a browser DB client.
 * Same fail-closed origin/token policy as the localhost read-only BFF.
 * Real production activation requires separate authenticated architecture review.
 */
export async function stagingCoreRead<T>(path:string):Promise<T> {
  if (!isStagingReadEnabled()) {
    throw new Error('staging_preview_disabled');
  }
  if (!(/^\/api\/v1\/grammar(?:\/[A-Za-z0-9_-]{1,128})?$/.test(path) ||
    path === '/api/v1/curriculum/jpd133/mappings')) {
    throw new Error('staging_route_not_allowed');
  }
  const origin = process.env.KIOKUDO_CORE_URL;
  const token = process.env.KIOKUDO_CORE_SERVICE_TOKEN;
  if (!origin || !token || token.length < 24 || token.startsWith('replace-')) {
    throw new Error('core_not_configured');
  }
  const url = stagingCoreOrigin(origin);
  url.pathname=path;
  const owner=verifyOwnerSession((await cookies()).get(SESSION_COOKIE)?.value);
  if(!owner)throw new Error('authentication_required');
  const ownerAssertion=signCoreOwnerAssertion(owner,'GET',url.pathname+url.search);
  const res=await fetch(url.toString(),{
    method:'GET',headers:{
      authorization:'Bearer '+token,
      'x-kiokudo-owner-assertion':ownerAssertion,
      accept:'application/json',
    },
    cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000),
  });
  if(!res.ok)throw new Error(res.status===404?'lesson_not_found':'core_staging_read_failed');
  const ct=res.headers.get('content-type')??'';
  if(!ct.includes('application/json'))throw new Error('invalid_core_response');
  return res.json() as Promise<T>;
}
