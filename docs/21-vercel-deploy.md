# Commit 21 — Vercel Deployment for SPA Routing

## 🇬🇧 English

### Requirements

Deploy the app to Vercel so it's publicly accessible:

- The app must build successfully from `npm run build`
- All URL paths must return `index.html` — React handles routing client-side
- The build output goes to `dist/`
- PDF and image assets in `public/` must be accessible at their original URLs

### What Was Added

**`vercel.json`:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### Concepts Explained

#### SPA routing — why all paths must return `index.html`

This app is a **Single-Page Application** (SPA). The entire app lives in one HTML file.
React handles navigation client-side via `useState<Page>` — no URL changes happen.

However, `public/` assets are served by path. Without rewrites, a request for a PDF:

```
GET /subiecte/en8/2024_var02_subiect.pdf
```

is served correctly — Vercel finds the file in `public/` and returns it.

For the app itself, the only real file is `/index.html`. If a user bookmarked
`https://app.vercel.app/` and refreshed, Vercel would serve `index.html`. If they
had saved some other URL, Vercel would return 404 — the file doesn't exist.

The rewrite rule handles this:

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

Every request that doesn't match a static file gets rewritten to `/index.html`.
The browser receives the React app, which renders the correct page.

**Rewrite vs redirect:**

| Type     | What the browser sees         | Status code |
| -------- | ----------------------------- | ----------- |
| Rewrite  | URL stays the same (`/board`) | 200         |
| Redirect | URL changes to `/index.html`  | 301 / 302   |

Rewrites are correct for SPAs — the URL should not change.

#### `vercel.json` field reference

```json
{
  "buildCommand": "npm run build",  // override default (Vercel detects Vite automatically,
                                    // but being explicit is safer)
  "outputDirectory": "dist",        // where Vite puts the built files
  "rewrites": [...]                 // URL rewrite rules (applied after static file check)
}
```

**How Vercel's request pipeline works:**

1. Check `public/` (now `dist/`) for a matching static file → serve it (no rewrite applied)
2. No match → apply rewrite rules in order
3. The catch-all `(.*)` matches everything → serve `index.html`

This means `/problems/en8_2024_var02_s1_01.png` is served as a static PNG (step 1),
while any other path falls through to `index.html` (steps 2–3).

#### Vite build output — 3 lazy chunks

After `npm run build`:

```
dist/assets/
  index-[hash].js          ← main bundle (CanvasBoard + shapes)
  FormulaPage-[hash].js    ← lazy chunk (KaTeX + 200 formulas)
  SubiectePage-[hash].js   ← lazy chunk (exam viewer)
  TestGenerator-[hash].js  ← lazy chunk (test generator)
  ProblemsReview-[hash].js ← lazy chunk (gallery)
  index-[hash].css
dist/problems/             ← copied from public/
dist/subiecte/             ← copied from public/
dist/pdf.worker.min.mjs    ← copied from public/
dist/index.html
```

Each `[hash]` is a content hash (e.g., `index-a3f8c2d.js`). If the file content
doesn't change between deploys, the hash stays the same — **CDN cache hit**.
If the file changes, the hash changes — **automatic cache invalidation**.

This is why assets are stored in `src/assets/` (gets hashed) vs `public/` (no hash,
stable URL). The trade-off: stable URLs for PDFs and workers, cache-busted URLs for JS.

#### Vercel auto-deploy from GitHub

1. Push to `main` branch → Vercel webhook fires
2. Vercel clones repo, runs `npm ci && npm run build`
3. `dist/` is deployed to Vercel's edge network (CDN)
4. Preview URL is posted as a PR comment; production URL updated on merge to `main`

No Docker, no servers, no configuration beyond `vercel.json`.

---

## 🇷🇴 Română

### Cerințe

Deployment pe Vercel: build cu `npm run build`, toate URL-urile returnează `index.html`,
asset-urile PDF + PNG accesibile la URL-urile originale.

### Ce s-a adăugat

**`vercel.json`:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Concepte explicate

#### SPA routing — de ce toate path-urile returnează `index.html`

App-ul este un SPA (Single-Page Application). Navigarea e gestionată de React
client-side (`useState<Page>`), nu de server. Orice request care nu matching un
fișier static trebuie redirecționat la `index.html`.

Regula catch-all:

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

Vercel aplică rewrite-urile **după** verificarea fișierelor statice:

1. `/problems/en8_2024_var02_s1_01.png` → fișier static în `dist/` → servit direct
2. Orice altceva → rewrite la `index.html` → React randează pagina corectă

**Rewrite vs redirect:**

- Rewrite: URL rămâne același, status 200 — corect pentru SPA
- Redirect: URL se schimbă la `/index.html`, status 301/302 — greșit pentru SPA

#### Output build Vite — chunk-uri lazy

```
dist/assets/
  index-[hash].js           ← bundle principal
  FormulaPage-[hash].js     ← chunk lazy (KaTeX + formule)
  SubiectePage-[hash].js    ← chunk lazy
  TestGenerator-[hash].js   ← chunk lazy
  ProblemsReview-[hash].js  ← chunk lazy
```

`[hash]` = hash al conținutului fișierului. Dacă conținutul nu se schimbă între
deploy-uri, hash-ul rămâne același → **cache CDN hit** (fișierul nu se re-descarcă).
Dacă conținutul se schimbă → hash nou → **cache invalidat automat**.

#### Vercel auto-deploy

Push pe `main` → webhook Vercel → `npm ci && npm run build` → `dist/` deploiat pe CDN.
URL de preview pentru fiecare PR. Zero configurare server.
