// This is the Worker's entry point. Cloudflare runs this script for every
// request. It does two jobs:
//   1. /api/cards requests are handled here, server-side — the API key is
//      attached from an environment variable and never sent to the browser.
//   2. everything else falls through to the static assets in /public
//      (index.html, etc.) via the ASSETS binding.

const ALLOWED_PARAMS = ["q", "page", "pageSize", "orderBy"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/cards")) {
      return handleCards(request, env);
    }

    // Not an API route — serve the static site.
    return env.ASSETS.fetch(request);
  },
};

async function handleCards(request, env) {
  const incoming = new URL(request.url);
  const upstream = new URL("https://api.pokemontcg.io/v2/cards");

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
      "Cache-Control": "no-store",
    },
  });
}
