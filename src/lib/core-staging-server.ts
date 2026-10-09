/**
 * Server-only local staging Core reader, deliberately NOT a browser DB client.
 * Same fail-closed origin/token policy as the localhost read-only BFF.
 * Real production activation requires separate authenticated architecture review.
 */
export async function stagingCoreRead<T>(path:string):Promise<T> {
  if(process.env.NODE_ENV!=='development' || process.env.KIOKUDO_STAGING_READ_ENABLED!=='true') {
    throw new Error('staging_preview_disabled');
  }
  if(!/^\/api\/v1\/(grammar(?:\/[A-Za-z0-9_-]{1,128})?)$/.test(path)) {
    throw new Error('staging_route_not_allowed');
  }
  const origin=process.env.KIOKUDO_CORE_URL;
  const token=process.env.KIOKUDO_CORE_SERVICE_TOKEN;
  if(!origin||!token||token.length<24||token.startsWith('replace-'))throw new Error('core_not_configured');
  const url=new URL(origin);
  if(url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname)||
    url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname)) {
    throw new Error('core_not_local_staging');
  }
  url.pathname=path;
  const res=await fetch(url.toString(),{
    method:'GET',headers:{authorization:`Bearer ${token}`,accept:'application/json'},
    cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000),
  });
  if(!res.ok)throw new Error(res.status===404?'lesson_not_found':'core_staging_read_failed');
  const ct=res.headers.get('content-type')??'';
  if(!ct.includes('application/json'))throw new Error('invalid_core_response');
  return res.json() as Promise<T>;
}
