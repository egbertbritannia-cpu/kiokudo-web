import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };

function validateCoreUrl(raw: string): URL {
  const u = new URL(raw);
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) {
    throw new Error('Only HTTPS core origin or local HTTP development is allowed');
  }
  if (u.username || u.password || u.search || u.hash) {
    throw new Error('Core origin must not include credentials, search or fragment');
  }
  return u;
}

export async function forward(request: NextRequest, context: Context): Promise<Response> {
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      if (new URL(originHeader).origin !== request.nextUrl.origin) {
        return Response.json({ error: 'forbidden_origin' }, { status: 403 });
      }
    } catch { return Response.json({ error: 'forbidden_origin' }, { status: 403 }); }
  }
  const base = process.env.KIOKUDO_CORE_URL;
  const token = process.env.KIOKUDO_CORE_SERVICE_TOKEN;
  if (!base || !token || token.length < 24 || token.startsWith('replace-')) {
    return Response.json({ error: 'backend_not_configured' }, { status: 503 });
  }

  let target: URL;
  try {
    target = validateCoreUrl(base);
  } catch {
    return Response.json({ error: 'backend_url_invalid' }, { status: 503 });
  }

  const { path } = await context.params;
  if (!path || !path.length || path.some(p => p === '.' || p === '..')) {
    return Response.json({ error: 'invalid_path' }, { status: 400 });
  }
  target.pathname = '/'+path.map(encodeURIComponent).join('/');
  target.search = request.nextUrl.search;

  const headers = new Headers({
    authorization: `Bearer ${token}`,
    accept: request.headers.get('accept') ?? 'application/json',
  });
  for (const name of ['content-type', 'x-request-id', 'idempotency-key']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const body = hasBody ? await request.arrayBuffer() : undefined;
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
    // Do not forward Set-Cookie, Location, CORS, content-encoding or hop-by-hop headers.
    const outputHeaders = new Headers({ 'cache-control': 'no-store' });
    const ct = upstream.headers.get('content-type');
    if (ct) outputHeaders.set('content-type',ct);
    return new Response(request.method === 'HEAD' ? null : await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: outputHeaders,
    });
  } catch {
    return Response.json({error:'backend_unavailable'},{status:502});
  }
}

export { forward as GET, forward as HEAD, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
