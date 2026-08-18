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

  const upstreamRes = await fetch(upstream.toString(), { headers });
  const body = await upstreamRes.text();

  return new Response(body, {
    status: upstreamRes.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
      "X-Debug-Key-Present": String(!!env.POKEMON_TCG_API_KEY),
    },
  });
}
