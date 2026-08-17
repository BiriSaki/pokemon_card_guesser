# Card ID — deploy with your API key hidden

This is a Cloudflare Pages project. The site itself is a static `index.html`;
the `functions/api/cards.js` file is a small serverless function that holds
your Pokémon TCG API key as a secret and proxies requests to
`api.pokemontcg.io` on the page's behalf. The key never appears in anything
sent to the browser.

**Note:** Cloudflare Pages' drag-and-drop "Direct Upload" does not support the
`functions/` folder — it's static files only. To deploy the function, connect
a GitHub repo instead (no CLI needed), as described below.


## Deploy via GitHub (recommended, no CLI)

1. Create a new repo on github.com (Public or Private, doesn't matter).
2. On the repo page, use **Add file → Upload files** and drag in `index.html`,
   `README.md`, and the `functions` folder — keep them at the repo root, not
   nested in a subfolder. Commit.
3. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**,
   authorize GitHub, and pick this repo.
4. Build settings: Framework preset **None**, Build command **blank**,
   Build output directory **/** (repo root). Save and deploy.
5. After the first deploy: **Settings → Environment variables**, add
   `POKEMON_TCG_API_KEY` with your key as the value (mark it Secret/Encrypt if offered).
6. Redeploy (Deployments tab → retrigger, or just push any small commit) so the
   function picks up the new environment variable.
7. Visit your `*.pages.dev` URL. Check the browser's Network tab — requests
   should go to `/api/cards`, never directly to `api.pokemontcg.io` with your key.

## Alternative: Wrangler CLI

```bash
npm install -g wrangler
wrangler pages project create card-id
wrangler pages secret put POKEMON_TCG_API_KEY --project-name=card-id
wrangler pages deploy . --project-name=card-id
```

## Local testing

```bash
npm install -g wrangler
wrangler pages dev . --binding POKEMON_TCG_API_KEY=your_key_here
```

This runs the site and the function locally at `http://localhost:8788`.

## How the key stays hidden

The browser only ever calls your own `/api/cards` path. Cloudflare runs
`functions/api/cards.js` on its servers, attaches `X-Api-Key` from the
`POKEMON_TCG_API_KEY` environment variable, and forwards the request to
`api.pokemontcg.io`. View-source or the browser's network tab will only ever
show requests to `/api/cards` — the real key is never transmitted to the
visitor's machine.
