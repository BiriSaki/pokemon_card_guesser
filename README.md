# Card ID — deploy with your API key hidden

This project runs as a Cloudflare **Worker with static assets** (Cloudflare's
current recommended setup — it folds together what used to be separate
"Pages" and "Workers" products). One Worker script handles everything:

- Requests to `/api/cards` are handled by `worker/index.js`, which attaches
  your Pokémon TCG API key (from an environment variable) and forwards the
  request to `api.pokemontcg.io`. The key never reaches the browser.
- Every other request falls through to the static files in `public/`
  (just `index.html`, the game itself).


## Project structure

```
wrangler.jsonc     — ties the worker script and static assets together
worker/index.js    — the server-side proxy logic (/api/cards)
public/index.html  — the game page (static, unchanged by deploys)
```

## Deploy via GitHub (no CLI)

1. Push this whole folder to a GitHub repo, keeping `wrangler.jsonc`,
   `worker/`, and `public/` at the repo root (not nested in a subfolder).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Workers → Connect to Git**,
   authorize GitHub, and pick this repo.
3. Cloudflare should detect `wrangler.jsonc` automatically and build a Worker
   with an `ASSETS` binding — not a static-assets-only deployment. If you
   previously created this project as assets-only and hit
   "Variables cannot be added to a Worker that only has static assets,"
   delete that project and recreate it after pushing `wrangler.jsonc`, so
   Cloudflare picks it up from the start.
4. After the first deploy: **Settings → Environment variables (or Variables and Secrets)**,
   add `POKEMON_TCG_API_KEY` with your key as the value (mark it Secret/Encrypt if offered).
5. Redeploy (Deployments tab → retrigger, or push any small commit) so the
   Worker picks up the new environment variable.
6. If the project page says **"No URLs enabled"**: go to
   **Settings → Domains & Routes** and enable the **workers.dev subdomain**
   (or add your own custom domain if you have one on Cloudflare). Your site
   will then be reachable at something like
   `https://card-id.<your-subdomain>.workers.dev`.
7. Visit that URL. Check the browser's Network tab — requests should go to
   `/api/cards`, never directly to `api.pokemontcg.io` with your key attached.

## Alternative: Wrangler CLI

```bash
npm install -g wrangler
wrangler login
wrangler secret put POKEMON_TCG_API_KEY
wrangler deploy
```

## Local testing

```bash
npm install -g wrangler
wrangler dev --var POKEMON_TCG_API_KEY:your_key_here
```

## How the key stays hidden

The browser only ever calls your own `/api/cards` path. `worker/index.js`
runs on Cloudflare's servers, attaches `X-Api-Key` from the
`POKEMON_TCG_API_KEY` environment variable, and forwards the request to
`api.pokemontcg.io`. View-source or the browser's network tab will only ever
show requests to `/api/cards` — the real key is never transmitted to the
visitor's machine.
