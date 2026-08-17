// Cloudflare Pages Function — runs on Cloudflare's servers, never in the browser.
// The API key lives in an environment variable (set in the Pages dashboard or
// via `wrangler secret put`) and is attached here, server-side, so it never
// reaches the page source the visitor sees.
//
// The frontend calls /api/cards?<params>, this forwards the allowed params to
// https://api.pokemontcg.io/v2/cards with the X-Api-Key header attached.

const ALLOWED_PARAMS = ["q", "page", "pageSize", "orderBy"];

export async function onRequestGet(context) {
  const { request, env } = context;
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
