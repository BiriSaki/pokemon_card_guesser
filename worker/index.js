// This is the Worker's entry point. Cloudflare runs this script for every
// request. It does three jobs:
//   1. /api/cards — proxies to api.pokemontcg.io/v2/cards, used to fetch a
//      random card each round.
//   2. /api/sets — proxies to api.pokemontcg.io/v2/sets, used once at
//      startup to populate the set dropdown.
//   3. everything else falls through to the static assets in /public
//      (index.html, etc.) via the ASSETS binding.
//
// Both proxy routes attach the API key from an environment variable
// server-side — it never reaches the browser.

const ALLOWED_PARAMS = ["q", "page", "pageSize", "orderBy"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/cards")) {
      return proxyToPokemonTCG(request, env, "cards", "no-store");
    }

    if (url.pathname.startsWith("/api/sets")) {
      // Set list barely changes — safe to cache in the browser for a while.
      return proxyToPokemonTCG(request, env, "sets", "public, max-age=86400");
    }

    // Not an API route — serve the static site.
    return env.ASSETS.fetch(request);
  },
};

async function proxyToPokemonTCG(request, env, resource, cacheControl) {
  const incoming = new URL(request.url);
  const upstream = new URL(`https://api.pokemontcg.io/v2/${resource}`);

  for (const key of ALLOWED_PARAMS) {
    if (incoming.searchParams.has(key)) {
      upstream.searchParams.set(key, incoming.searchParams.get(key));
    }
  }

  const headers = {};
  if (env.POKEMON_TCG_API_KEY) {
    headers["X-Api-Key"] = env.POKEMON_TCG_API_KEY;
  }

  // The upstream API has become noticeably flaky (frequent 5xx/502s) since
  // the team's focus shifted to their commercial successor. Retry a couple
  // times with backoff before giving up — most failures are transient.
  const MAX_ATTEMPTS = 3;
  let lastRes = null;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(upstream.toString(), { headers });
      if (res.ok) {
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": cacheControl,
            "X-Debug-Key-Present": String(!!env.POKEMON_TCG_API_KEY),
            "X-Upstream-Attempts": String(attempt),
          },
        });
      }
      lastRes = res;
      // Only retry on server-side errors — a 4xx won't fix itself.
      if (res.status < 500) break;
    } catch (err) {
      lastError = err;
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, attempt * 400));
    }
  }

  if (lastRes) {
    const body = await lastRes.text();
    return new Response(body, {
      status: lastRes.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Debug-Key-Present": String(!!env.POKEMON_TCG_API_KEY),
        "X-Upstream-Attempts": String(MAX_ATTEMPTS),
      },
    });
  }

  return new Response(
    JSON.stringify({ error: "upstream_unreachable", message: String(lastError) }),
    {
      status: 502,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );
}
