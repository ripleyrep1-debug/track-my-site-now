# Deploy to Cloudflare Workers (keep Supabase)

This project is a TanStack Start app already configured for Cloudflare Workers
(`@cloudflare/vite-plugin` + `wrangler.jsonc` with `nodejs_compat`). Supabase
stays as the database / auth / cron — only the frontend + server functions move
to your Workers account.

---

## 0. Prerequisites

- Cloudflare account (you have one)
- Domain on Cloudflare DNS (you have it)
- Node 20+ and `npm i -g wrangler` (or use `npx wrangler`)
- The Supabase project keeps running — **do not delete it**

---

## 1. Get your own Google Maps API key

The current key in `.env` is Lovable's managed key, locked to `*.lovable.app`.
On your custom domain it will return `RefererNotAllowedMapError`.

1. Go to https://console.cloud.google.com → create or select a project
2. Enable billing on the project (required, but free tier covers most usage)
3. APIs & Services → Library → enable **Maps JavaScript API**
4. APIs & Services → Credentials → **Create credentials → API key**
5. Restrict the key:
   - **Application restrictions** → HTTP referrers
   - Add: `https://yourdomain.com/*` AND `https://*.yourdomain.com/*`
   - **API restrictions** → restrict to **Maps JavaScript API**
6. Copy the key — you'll use it in step 4.

---

## 2. Wrangler login + project name

```bash
wrangler login
```

Edit `wrangler.jsonc` if you want a different worker name:

```jsonc
{
  "name": "logiport-tracking",          // change to whatever you want
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts"
}
```

---

## 3. Set Worker secrets (server-side)

These are read at runtime by server functions (`process.env.*`). Run from the
project root:

```bash
# Supabase
wrangler secret put SUPABASE_URL
# paste: https://nzinjbsrwphopagskpln.supabase.co

wrangler secret put SUPABASE_PUBLISHABLE_KEY
# paste: sb_publishable_fm8zxWzNVy9JzFGsBwpfSA_oC-30jfC

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste from Supabase dashboard → Project Settings → API → service_role
```

> Get the service role key from https://supabase.com/dashboard/project/nzinjbsrwphopagskpln/settings/api

---

## 4. Set build-time env vars (client-side, baked into bundle)

These need to exist in `.env` **before** running `npm run build` because Vite
inlines them into the JS bundle:

Create `.env.production`:

```
VITE_SUPABASE_URL=https://nzinjbsrwphopagskpln.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fm8zxWzNVy9JzFGsBwpfSA_oC-30jfC
VITE_SUPABASE_PROJECT_ID=nzinjbsrwphopagskpln
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY=YOUR_OWN_GOOGLE_KEY_FROM_STEP_1
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID=
```

> Note: `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` can be left blank —
> it's only used as a Lovable analytics channel parameter and has no effect on
> map functionality.

---

## 5. Build + deploy

```bash
npm install
npm run build
wrangler deploy
```

First deploy gives you `https://logiport-tracking.<your-subdomain>.workers.dev`.
Open it — admin login, tracking page, and map should all work.

---

## 6. Point your domain at the Worker

In Cloudflare dashboard:

1. Workers & Pages → your worker → **Settings → Domains & Routes**
2. **Add Custom Domain** → enter `yourdomain.com`
3. Cloudflare auto-creates the DNS record + SSL cert (≈1 min)
4. Repeat for `www.yourdomain.com` if you want it

Done — `https://yourdomain.com` now serves the app.

---

## 7. Update Supabase Auth allowed URLs

Supabase blocks redirects to unknown domains. Add yours:

1. https://supabase.com/dashboard/project/nzinjbsrwphopagskpln/auth/url-configuration
2. **Site URL** → `https://yourdomain.com`
3. **Redirect URLs** → add `https://yourdomain.com/**`

Otherwise admin login will fail after email confirmation.

---

## 8. Verify the auto-progress cron still works

The `pg_cron` job that calls `advance_auto_shipments()` runs entirely inside
Supabase — it has **no dependency on where the frontend is hosted**. It keeps
working automatically. Verify with:

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

(Run from Supabase SQL editor.)

---

## 9. Subsequent deploys

```bash
npm run build && wrangler deploy
```

Or set up GitHub Actions to deploy on push — Cloudflare has a template:
https://developers.cloudflare.com/workers/ci-cd/github-actions/

---

## Troubleshooting

**Blank page / "RefererNotAllowedMapError" in console**
→ Google Maps key referrer restrictions don't include your domain. Re-check step 1.

**Admin login redirects to wrong URL**
→ Step 7 not done. Update Supabase Auth URL config.

**"process.env.X is undefined" in worker logs**
→ Secret not set. Re-run `wrangler secret put X`.

**Map shows but no tiles / tracking page blank**
→ Likely `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` was empty at build
time. Recreate `.env.production`, rebuild, redeploy.

**Tracking API works but admin pages 404 on refresh**
→ Should not happen — TanStack handles SPA fallback automatically on Workers.
If it does, verify the build output includes `_worker.js` / the Worker entry.

---

## What you do NOT need to change

- ✅ Database schema, RLS, functions — all stay in Supabase
- ✅ Cron jobs — keep running in Supabase
- ✅ Auth — keep using Supabase Auth
- ✅ Code — already targets Workers via `@cloudflare/vite-plugin`
- ✅ Server functions — `createServerFn` runs in workerd just like in Lovable

The ONLY differences are: your Worker, your domain, your Google Maps key.
