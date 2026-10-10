import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, scryptSync } from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  SESSION_COOKIE, createOwnerSession, verifyOwnerSession, sessionFromCookieHeader,
  verifyOwnerPassword, signCoreOwnerAssertion,
} from '../src/lib/owner-auth-server.js';
import { isAllowedReadRoute, isAllowedReadQuery } from '../src/lib/bff-read-policy.js';
import { isStagingReadEnabled, stagingCoreOrigin } from '../src/lib/staging-core-origin.js';
import { POST as login } from '../src/app/api/auth/login/route.js';
import { POST as logout } from '../src/app/api/auth/logout/route.js';
import { GET as sessionStatus } from '../src/app/api/auth/session/route.js';
import { GET as coreRead, POST as coreWrite } from '../src/app/api/backend/[...path]/route.js';
import { middleware } from '../src/middleware.js';

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
  'KIOKUDO_CORE_ALLOWED_HOST',
] as const;

async function withFixture(run: () => Promise<void>) {
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = 'development';
    process.env.KIOKUDO_OWNER_SUBJECT = owner;
    process.env.KIOKUDO_SESSION_SECRET = 'fixture-session-key-not-a-deploy-secret-2026';
    process.env.KIOKUDO_INTERNAL_ASSERTION_KEY = 'fixture-core-key-not-a-deploy-secret-2026';
    process.env.KIOKUDO_LOGIN_PASSWORD_SCRYPT = passwordHash;
    process.env.KIOKUDO_STAGING_READ_ENABLED = 'true';
    process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED = 'false';
    process.env.KIOKUDO_CORE_URL = 'http://127.0.0.1:4000';
    process.env.KIOKUDO_CORE_SERVICE_TOKEN = 'synthetic-test-service-token-not-secret-2026';
    await run();
  } finally {
    for (const key of envKeys) {
      const old = previous[key];
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
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
    assert.equal(verifyOwnerPassword(password), true);
    assert.equal(verifyOwnerPassword('incorrect-test-password'), false);
    assert.equal(verifyOwnerPassword(24), false);
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
    assert.equal(isAllowedReadRoute('api/v1/cards'), true);
    assert.equal(isAllowedReadRoute('api/v1/reviews'), false);
    assert.equal(isAllowedReadRoute('api/v1/grammar/../cards'), false);
    assert.equal(isAllowedReadQuery('api/v1/cards', '?limit=10&deck=jpd'), true);
    assert.equal(isAllowedReadQuery('api/v1/cards','?limit=10&limit=100'), false);
    assert.equal(isAllowedReadQuery('api/v1/cards','?userId=other'), false);
    assert.equal(isAllowedReadQuery('api/v1/cards','?search=%0a'), false);
    assert.equal(isAllowedReadQuery('api/v1/cards','?search=%GG'), false);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?lessonId=all&limit=15'), true);
    assert.equal(isAllowedReadQuery('api/v1/grammar/practice','?limit=201'), false);
  });
});

test('P01: unsigned browser cannot read Core or submit a review via BFF', async () => {
  await withFixture(async () => {
    const url = 'http://localhost:3000/api/backend/api/v1/cards?limit=10';
    const ctx = { params: Promise.resolve({ path:['api','v1','cards'] }) };
    const anonymous = await coreRead(request(url), ctx);
    assert.equal(anonymous.status,401);
    const forbidden = await coreRead(request(url,'GET',{
      headers:{cookie:'kiokudo_owner_session=untrusted'},
    }),ctx);
    assert.equal(forbidden.status,401);
    const review = await coreWrite(request(url,'POST'),ctx);
    assert.equal(review.status,405);
  });
});

test('P01: Core assertions bind trusted owner to exact path/method and never permit browser writes', async () => {
  await withFixture(async () => {
    const assertion = signCoreOwnerAssertion(owner,'GET','/api/v1/cards?limit=10');
    const [encoded, mac] = assertion.split('.');
    assert.equal(mac.length,43);
    const fields = JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
    assert.equal(fields.sub,owner);
    assert.equal(fields.iss,'kiokudo-web');
    assert.equal(fields.aud,'kiokudo-core');
    assert.equal(fields.method,'GET');
    assert.equal(fields.scope,'read');
    assert.equal(fields.path,'/api/v1/cards?limit=10');
    const expected = createHmac('sha256', process.env.KIOKUDO_INTERNAL_ASSERTION_KEY!)
      .update(encoded).digest('base64url');
    assert.equal(mac,expected);
    assert.throws(()=>signCoreOwnerAssertion('test_owner_beta','GET','/api/v1/cards'),/unavailable/);
    assert.throws(()=>signCoreOwnerAssertion(owner,'POST','/api/v1/reviews'),/unavailable/);
  });
});

test('P01: staging URL cannot silently target production or unpinned hosts', async () => {
  await withFixture(async () => {
    assert.equal(isStagingReadEnabled('localhost'),true);
    assert.equal(isStagingReadEnabled('public.example.com'),false);
    assert.equal(stagingCoreOrigin('http://127.0.0.1:4000').hostname,'127.0.0.1');
    assert.throws(()=>stagingCoreOrigin('https://production.example.com'));
    assert.throws(()=>stagingCoreOrigin('http://127.0.0.1:4000/internal'));
    process.env.NODE_ENV='production';
    process.env.KIOKUDO_REMOTE_STAGING_READ_ENABLED='true';
    process.env.KIOKUDO_CORE_ALLOWED_HOST='staging.example.org';
    assert.equal(stagingCoreOrigin('https://staging.example.org').hostname,'staging.example.org');
    assert.throws(()=>stagingCoreOrigin('https://other.example.org'));
    assert.throws(()=>stagingCoreOrigin('http://staging.example.org'));
  });
});

test('P01: middleware blocks unauthenticated learner pages and allows valid signed session', async () => {
  await withFixture(async () => {
    const location = 'http://localhost:3000/review';
    const redirect = await middleware(request(location));
    assert.equal(redirect.status,307);
    assert.equal(new URL(redirect.headers.get('location')!).pathname,'/login');
    const cookie = SESSION_COOKIE + '=' + createOwnerSession();
    const allowed = await middleware(request(location,'GET',{headers:{cookie}}));
    assert.equal(allowed.headers.get('x-middleware-next'),'1');
  });
});
