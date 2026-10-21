import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { onRequestGet } from '../functions/api/github-stars.ts';
import { repositoryApiUrl } from '../lib/site-url.ts';

const realFetch = globalThis.fetch;
let cached;
let upstreamCalls;
let clock;

// Models the parts of Cloudflare's cache the function relies on: entries expire
// after their Cache-Control max-age, and 4xx/5xx responses are not kept.
beforeEach(() => {
  cached = new Map();
  upstreamCalls = [];
  clock = 0;
  globalThis.caches = {
    open: async () => ({
      match: async (request) => {
        const entry = cached.get(request.url);
        return entry && clock < entry.expires ? entry.response.clone() : undefined;
      },
      put: async (request, response) => {
        if (response.status >= 400) return;
        const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control'))?.[1]);
        cached.set(request.url, { response, maxAge, expires: clock + maxAge });
      },
    }),
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete globalThis.caches;
});

function githubAnswers(...responses) {
  globalThis.fetch = async (url, init) => {
    upstreamCalls.push({ url, headers: new Headers(init?.headers) });
    return responses.shift()();
  };
}

async function request(path = '/api/github-stars', env = {}) {
  const pending = [];
  const response = await onRequestGet({
    request: new Request(`https://docs.example${path}`),
    env,
    waitUntil: (promise) => pending.push(promise),
  });
  await Promise.all(pending);
  return response;
}

test('serves the star count and answers repeat requests from the cache', async () => {
  githubAnswers(() => Response.json({ stargazers_count: 1105 }));

  const first = await request('/api/github-stars', { GITHUB_TOKEN: 'abc' });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { stars: 1105 });
  assert.equal(first.headers.get('Cache-Control'), 'public, max-age=3600');
  assert.equal(upstreamCalls[0].url, repositoryApiUrl);
  assert.equal(upstreamCalls[0].headers.get('Authorization'), 'Bearer abc');
  assert.ok(upstreamCalls[0].headers.get('User-Agent'), 'GitHub rejects API requests without a User-Agent');

  const second = await request();
  assert.deepEqual(await second.json(), { stars: 1105 });
  assert.equal(upstreamCalls.length, 1);
});

test('omits Authorization when no token is configured', async () => {
  githubAnswers(() => Response.json({ stargazers_count: 1105 }));
  await request();
  assert.equal(upstreamCalls[0].headers.get('Authorization'), null);
});

test('a rate limit is honored: GitHub is not asked again until its retry window passes', async () => {
  githubAnswers(
    () => Response.json({ message: 'API rate limit exceeded' }, { status: 403, headers: { 'retry-after': '120' } }),
    () => Response.json({ stargazers_count: 1105 }),
  );

  const limited = await request();
  assert.equal(limited.status, 502);
  assert.match((await limited.json()).error, /403/);
  // Browsers must not keep the error; only the function's cache waits out the window.
  assert.equal(limited.headers.get('Cache-Control'), 'no-store');

  clock = 119;
  const stillLimited = await request();
  assert.equal(stillLimited.status, 502);
  assert.equal(stillLimited.headers.get('Cache-Control'), 'no-store');
  assert.equal(upstreamCalls.length, 1);

  clock = 120;
  const recovered = await request();
  assert.deepEqual(await recovered.json(), { stars: 1105 });
  assert.equal(upstreamCalls.length, 2);
});

test('waits for x-ratelimit-reset once the limit is spent', async () => {
  githubAnswers(
    () =>
      new Response(null, {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600) },
      }),
  );
  await request();
  assert.ok(Math.abs(cached.get('https://docs.example/api/github-stars').maxAge - 600) <= 1);
});

test('a retry window longer than the success lifetime is waited out in full', async () => {
  githubAnswers(
    () => new Response(null, { status: 429, headers: { 'retry-after': '7200' } }),
    () => Response.json({ stargazers_count: 1105 }),
  );
  await request();

  clock = 7199;
  assert.equal((await request()).status, 502);
  assert.equal(upstreamCalls.length, 1);

  clock = 7200;
  assert.deepEqual(await (await request()).json(), { stars: 1105 });
  assert.equal(upstreamCalls.length, 2);
});

test('any other failure waits at least a minute before asking again', async () => {
  githubAnswers(
    () => Response.json({ message: 'unexpected shape' }),
    () => new Response(null, { status: 500 }),
  );

  const malformed = await request();
  assert.equal(malformed.status, 502);
  assert.equal(cached.get('https://docs.example/api/github-stars').maxAge, 60);

  clock = 60;
  const serverError = await request();
  assert.match((await serverError.json()).error, /500/);
  assert.equal(upstreamCalls.length, 2);
});

test('a query string cannot bypass the cache and force a GitHub call', async () => {
  githubAnswers(() => Response.json({ stargazers_count: 1105 }));
  await request();

  for (const path of ['/api/github-stars?bust=1', '/api/github-stars?bust=2']) {
    const response = await request(path);
    assert.deepEqual(await response.json(), { stars: 1105 });
  }
  assert.equal(upstreamCalls.length, 1);
});
