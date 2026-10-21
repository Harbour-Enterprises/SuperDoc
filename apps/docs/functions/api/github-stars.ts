import { repositoryApiUrl } from '../../lib/site-url';

interface Env {
  GITHUB_TOKEN?: string;
}

interface Context {
  request: Request;
  env: Env;
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Serves the repository's star count to the site header from Cloudflare's cache.
 *
 * Browsers calling GitHub directly share its 60-requests-per-hour limit per IP
 * address, so readers on a busy network saw the header's fallback instead. Here
 * GitHub is asked about once an hour per Cloudflare data center. A failure is
 * cached too, for as long as GitHub asks callers to wait: it warns that callers
 * who keep retrying while rate limited can be banned.
 */
export async function onRequestGet(context: Context) {
  const cache = await caches.open('github-stars');
  // Keyed without the query string, so a cache-busting URL cannot force a GitHub call.
  const cacheKey = new Request(new URL('/api/github-stars', context.request.url));
  const cached = await cache.match(cacheKey);
  if (cached) {
    const body: unknown = await cached.clone().json();
    return typeof body === 'object' && body !== null && 'error' in body ? failureResponse(body.error) : cached;
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    // GitHub rejects API requests without a User-Agent, and Workers send none.
    'User-Agent': 'superdoc-docs',
  };
  if (context.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${context.env.GITHUB_TOKEN}`;

  const upstream = await fetch(repositoryApiUrl, { headers });
  const data: unknown = upstream.ok ? await upstream.json() : null;
  if (
    typeof data !== 'object' ||
    data === null ||
    !('stargazers_count' in data) ||
    typeof data.stargazers_count !== 'number'
  ) {
    const error = `GitHub answered ${upstream.status}`;
    // Stored as a 200 because Cloudflare's cache does not keep 4xx or 5xx
    // responses from cache.put, even with an explicit max-age.
    const retryMarker = Response.json(
      { error },
      { headers: { 'Cache-Control': `max-age=${retryDelaySeconds(upstream.headers)}` } },
    );
    context.waitUntil(cache.put(cacheKey, retryMarker));
    return failureResponse(error);
  }

  const response = Response.json(
    { stars: data.stargazers_count },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/**
 * How long to wait before asking GitHub again, following its rate-limit rules:
 * `retry-after` when sent, then `x-ratelimit-reset` once the limit is spent,
 * otherwise a minute. Never less than a minute, so a data center asks at most
 * once a minute. There is no upper bound: asking before GitHub's own window
 * ends is what risks a ban.
 */
function retryDelaySeconds(headers: Headers) {
  const retryAfter = Number(headers.get('retry-after'));
  const reset = Number(headers.get('x-ratelimit-reset'));
  let seconds = 60;
  if (retryAfter > 0) seconds = retryAfter;
  else if (headers.get('x-ratelimit-remaining') === '0' && reset > 0) seconds = reset - Date.now() / 1000;
  return Math.ceil(Math.max(seconds, 60));
}

// The retry window applies to this function's cache only; browsers ask again on the next page.
function failureResponse(error: unknown) {
  return Response.json({ error }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
}
