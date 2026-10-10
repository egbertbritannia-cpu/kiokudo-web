import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, scryptSync } from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  SESSION_COOKIE, createOwnerSession, verifyOwnerSession, sessionFromCookieHeader,
  verifyOwnerPassword, signCoreOwnerAssertion,
} from '../src/lib/owner-auth-server.js';
import { isAllowedReadRoute, isAllowedReadQuery } from '../src/lib/bff-read-policy.js';
import { hasTrustedRequestOrigin } from '../src/lib/origin-policy.js';
import { isStagingReadEnabled, stagingCoreOrigin } from '../src/lib/staging-core-origin.js';
import { POST as login } from '../src/app/api/auth/login/route.js';
import { POST as logout } from '../src/app/api/auth/logout/route.js';
import { GET as sessionStatus } from '../src/app/api/auth/session/route.js';
import { GET as coreRead, POST as coreWrite } from '../src/app/api/backend/[...path]/route.js';
import { middleware } from '../src/middleware.js';
import { loginlessOwnerForHost } from '../src/lib/loginless-access.js';

const owner = 'test_owner_alpha';
const password = 'synthetic-test-password-2026';
const salt = Buffer.alloc(16, 7);
const passwordHash = salt.toString('hex') + ':' +
  scryptSync(password, salt, 64).toString('hex');
const envKeys = [
  'NODE_ENV', 'KIOKUDO_OWNER_SUBJECT', 'KIOKUDO_SESSION_SECRET',
  'KIOKUDO_INTERNAL_ASSERTION_KEY', 'KIOKUDO_LOGIN_PASSWORD_SCRYPT',
  'KIOKUDO_STAGING_READ_ENABLED', 'KIOKUDO_REMOTE_STAGING_READ_ENABLED',
  'KIOKUDO_CORE_URL', 'KIOKUDO_CORE_SERVICE_TOKEN',
  'KIOKUDO_CORE_ALLOWED_HOST', 'KIOKUDO_WEB_PUBLIC_ORIGIN',
  'KIOKUDO_WEB_STAGING_WRITES_ENABLED', 'KIOKUDO_PUBLIC_LOGIN_RATE_LIMIT_ACK',
  'KIOKUDO_LOGINLESS_LOCAL_ENABLED', 'KIOKUDO_LOGINLESS_PRIVATE_MODE',
  'KIOKUDO_PRIVATE_INGRESS_VERIFIED',
] as const;

async function withFixture(run: () => Promise<void>) {
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, { NODE_ENV: 'development' });
    process.env.KIOKUDO_OWNER_SUBJECT = owner;
    process.env.KIOKUDO_SESSION_SECRET = 'fixture-session-key-not-a-deploy-secret-2026';
    process.env.KIOKUDO_INTERNAL_ASSERTION_KEY = 'fixture-core-key-not-a-deploy-secret-2026';
    process.env.KIOKUDO_LOGIN_PASSWORD_SCRYPT = passwordHash;
    process.env.KIOKUDO_LOGINLESS_LOCAL_ENABLED = 'false';
    process.env.KIOKUDO_LOGINLESS_PRIVATE_MODE = 'false';
    process.env.KIOKUDO_PRIVATE_INGRESS_VERIFIED = 'false';
    process.env.KIOKUDO_STAGING_READ_ENABLED = 'true';
    process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED = 'false';
    process.env.KIOKUDO_CORE_URL = 'http://127.0.0.1:4000';
    process.env.KIOKUDO_CORE_SERVICE_TOKEN = 'synthetic-test-service-token-not-secret-2026';
    await run();
  } finally {
    for (const key of envKeys) {
      const old = previous[key];
      if (old === undefined) delete process.env[key];
      else Reflect.set(process.env, key, old);
    }
  }
}

function request(uri: string, method = 'GET', init: {
  headers?: Record<string, string>, body?: string,
} = {}) {
  return new NextRequest(uri, { method, ...init });
}

test('P01: scrypt password and owner session reject wrong, tampered and foreign identity', async () => {
  await withFixture(async () => {
    assert.equal(await verifyOwnerPassword(password), true);
    assert.equal(await verifyOwnerPassword('incorrect-test-password'), false);
    assert.equal(await verifyOwnerPassword(24), false);
    const cookie = createOwnerSession();
    assert.equal(verifyOwnerSession(cookie), owner);
    assert.equal(sessionFromCookieHeader('foo=bar; ' + SESSION_COOKIE + '=' + cookie), owner);
    assert.equal(verifyOwnerSession(cookie.slice(0,-1) + (cookie.endsWith('A') ? 'B' : 'A')), null);
    process.env.KIOKUDO_OWNER_SUBJECT = 'test_owner_beta';
    assert.equal(verifyOwnerSession(cookie), null, 'signed session cannot switch owners');
    process.env.KIOKUDO_OWNER_SUBJECT = owner;
    delete process.env.KIOKUDO_SESSION_SECRET;
    assert.equal(verifyOwnerSession(cookie), null, 'missing HMAC secret fails closed');
  });
});

test('P01: login verifies origin, sets secure session cookie, logout clears it', async () => {
  await withFixture(async () => {
    const unauthorized = await login(request('http://localhost:3000/api/auth/login', 'POST', {
      headers: { origin:'https://foreign.example', 'content-type':'application/json' },
      body: JSON.stringify({ password }),
    }));
    assert.equal(unauthorized.status, 403);

    const wrong = await login(request('http://localhost:3000/api/auth/login','POST', {
      headers: { origin:'http://localhost:3000', 'content-type':'application/json' },
      body: JSON.stringify({ password:'bad' }),
    }));
    assert.equal(wrong.status,401);

    const allowed = await login(request('http://localhost:3000/api/auth/login','POST', {
      headers: { origin:'http://localhost:3000', 'content-type':'application/json' },
      body: JSON.stringify({ password }),
    }));
    assert.equal(allowed.status, 200);
    const cookie = allowed.cookies.get(SESSION_COOKIE);
    assert.ok(cookie?.value);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, 'strict');
    const value = cookie.value;
    const status = sessionStatus(request('http://localhost:3000/api/auth/session', 'GET',{
      headers:{cookie:SESSION_COOKIE + '=' + value},
    }));
    assert.equal((await status.json()).authenticated, true);

    const rejectedLogout = await logout(request('http://localhost:3000/api/auth/logout','POST',{
      headers:{origin:'https://foreign.example'},
    }));
    assert.equal(rejectedLogout.status, 403);
    const cleared = await logout(request('http://localhost:3000/api/auth/logout','POST',{
      headers:{origin:'http://localhost:3000'},
    }));
    assert.equal(cleared.status,200);
    assert.equal(cleared.cookies.get(SESSION_COOKIE)?.maxAge, 0);
  });
});

test('P01: route/query denylist stops unknown paths, duplicates and malicious query input', async () => {
  await withFixture(async () => {
    assert.equal(isAllowedReadRoute('api/v1/cards'), false);
    assert.equal(isAllowedReadRoute('api/v1/reviews'), false);
    assert.equal(isAllowedReadRoute('api/v1/curriculum/jpd133/mappings'), false);
    assert.equal(isAllowedReadRoute('api/v1/grammar/../cards'), false);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice', '?limit=10&lessonId=all'), true);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?limit=10&limit=100'), false);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?userId=other'), false);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?lessonId=%0a'), false);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?lessonId=%GG'), false);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?lessonId=all&limit=15'), true);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?limit=201'), false);
  });
});

test('P01: unsigned browser cannot read Core or submit a review via BFF', async () => {
  await withFixture(async () => {
    const url = 'http://localhost:3000/api/backend/api/v1/grammar/practice?limit=10';
    const ctx = { params: Promise.resolve({ path:['api','v1','grammar','practice'] }) };
    const anonymous = await coreRead(request(url), ctx);
    assert.equal(anonymous.status,401);
    const forbidden = await coreRead(request(url,'GET',{
      headers:{cookie:'kiokudo_owner_session=untrusted'},
    }),ctx);
    assert.equal(forbidden.status,401);
    const review = await coreWrite(request(url,'POST'),ctx);
    assert.equal(review.status,403);
  });
});

test('P01: Core assertions bind trusted owner to exact path/method and never permit browser writes', async () => {
  await withFixture(async () => {
    const assertion = signCoreOwnerAssertion(owner,'GET','/api/v1/grammar/practice?limit=10');
    const [encoded, mac] = assertion.split('.');
    assert.equal(mac.length,43);
    const fields = JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
    assert.equal(fields.sub,owner);
    assert.equal(fields.iss,'kiokudo-web');
    assert.equal(fields.aud,'kiokudo-core');
    assert.equal(fields.method,'GET');
    assert.equal(fields.scope,'read');
    assert.equal(fields.path,'/api/v1/grammar/practice?limit=10');
    const expected = createHmac('sha256', process.env.KIOKUDO_INTERNAL_ASSERTION_KEY!)
      .update(encoded).digest('base64url');
    assert.equal(mac,expected);
    assert.throws(()=>signCoreOwnerAssertion('test_owner_beta','GET','/api/v1/grammar'),/unavailable/);
    const writeAssertion=signCoreOwnerAssertion(owner,'POST','/api/v1/grammar/practice/attempts');
    const [payload]=writeAssertion.split('.');
    const fields2=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    assert.equal(fields2.scope,'write');
    assert.equal(fields2.method,'POST');
  });
});

test('P01: staging URL cannot silently target production or unpinned hosts', async () => {
  await withFixture(async () => {
    assert.equal(isStagingReadEnabled('localhost'),true);
    assert.equal(isStagingReadEnabled('public.example.com'),false);
    assert.equal(stagingCoreOrigin('http://127.0.0.1:4000').hostname,'127.0.0.1');
    assert.throws(()=>stagingCoreOrigin('https://production.example.com'));
    assert.throws(()=>stagingCoreOrigin('http://127.0.0.1:4000/internal'));
    Object.assign(process.env, { NODE_ENV: 'production' });
    process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED='true';
    process.env.KIOKUDO_CORE_ALLOWED_HOST='staging.example.org';
    assert.equal(stagingCoreOrigin('https://staging.example.org').hostname,'staging.example.org');
    assert.throws(()=>stagingCoreOrigin('https://other.example.org'));
    assert.throws(()=>stagingCoreOrigin('http://staging.example.org'));
  });
});

test('P01: old login link is retired and no page middleware redirects IELTS', async () => {
  await withFixture(async () => {
    const route = middleware(request('http://localhost:3000/login'));
    assert.equal(route.status, 307);
    assert.equal(new URL(route.headers.get('location')!).pathname, '/');
    // Middleware is restricted to /login, so /ielts is not intercepted.
    assert.deepEqual((await import('../src/middleware.js')).config.matcher, ['/login']);
  });
});

test('Loginless: local owner works, remote owner needs two opt-ins and a pinned private host', async () => {
  await withFixture(async () => {
    assert.equal(loginlessOwnerForHost('localhost'), null);
    process.env.KIOKUDO_LOGINLESS_LOCAL_ENABLED = 'true';
    assert.equal(loginlessOwnerForHost('localhost'), owner);
    assert.equal(loginlessOwnerForHost('127.0.0.1'), owner);
    assert.equal(loginlessOwnerForHost('public.example.org'), null);

    Object.assign(process.env, { NODE_ENV:'production',
      KIOKUDO_WEB_PUBLIC_ORIGIN:'https://private.example.org',
      KIOKUDO_LOGINLESS_PRIVATE_MODE:'true' });
    assert.equal(loginlessOwnerForHost('private.example.org'), null);
    process.env.KIOKUDO_PRIVATE_INGRESS_VERIFIED = 'true';
    assert.equal(loginlessOwnerForHost('private.example.org'), owner);
    assert.equal(loginlessOwnerForHost('public.example.org'), null);
    assert.equal(loginlessOwnerForHost('localhost'), null);
    delete process.env.KIOKUDO_WEB_PUBLIC_ORIGIN;
    assert.equal(loginlessOwnerForHost('private.example.org'), null);
  });
});

test('Loginless: API forwards authorized localhost reads without app cookie', async () => {
  await withFixture(async () => {
    process.env.KIOKUDO_LOGINLESS_LOCAL_ENABLED = 'true';
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({success:true,data:[]}),{
      status:200,headers:{'content-type':'application/json'},
    });
    try {
      const ctx = { params: Promise.resolve({ path:['api','v1','ielts','dashboard'] }) };
      const res = await coreRead(request('http://localhost:3000/api/backend/api/v1/ielts/dashboard'),ctx);
      assert.equal(res.status, 200);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
});


test('P01: same-origin CSRF policy tolerates only local host aliases and pins public HTTPS origin', async () => {
  await withFixture(async () => {
    assert.equal(hasTrustedRequestOrigin(request('http://localhost:3000/api/auth/login','POST',{
      headers:{origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000'},
    })),true);
    assert.equal(hasTrustedRequestOrigin(request('http://localhost:3000/api/auth/login','POST',{
      headers:{origin:'http://attacker.example',host:'localhost:3000'},
    })),false);
    assert.equal(hasTrustedRequestOrigin(request('http://localhost:3000/api/auth/login','POST',{
      headers:{origin:'http://127.0.0.1:3001',host:'localhost:3000'},
    })),false);
    Object.assign(process.env,{NODE_ENV:'production',KIOKUDO_WEB_PUBLIC_ORIGIN:'https://staging.example.org'});
    assert.equal(hasTrustedRequestOrigin(request('https://staging.example.org/api/auth/login','POST',{
      headers:{origin:'https://staging.example.org',host:'staging.example.org'},
    })),true);
    assert.equal(hasTrustedRequestOrigin(request('https://staging.example.org/api/auth/login','POST',{
      headers:{origin:'https://other.example.org',host:'staging.example.org'},
    })),false);
    delete process.env.KIOKUDO_WEB_PUBLIC_ORIGIN;
    assert.equal(hasTrustedRequestOrigin(request('https://staging.example.org/api/auth/login','POST',{
      headers:{origin:'https://staging.example.org',host:'staging.example.org'},
    })),false);
  });
});
