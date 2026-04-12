# Hybrid Crawlee ZAP Scraper

`scrapers/zapCrawleeHybrid.js` replaces the purely Puppeteer-based ZAP scraper
with a two-phase Crawlee pipeline:

| Phase | Crawler | Purpose |
|---|---|---|
| 1 – List | `CheerioCrawler` | Fast HTTP extraction of card data from listing pages |
| 2 – Modal | `PuppeteerCrawler` | Browser interaction to open the "duplicate advertisers" modal for affected cards |

Results are persisted to **Supabase** instead of JSON files. Re-running the
scraper performs an upsert keyed on `(source, listing_url)` so existing rows
are updated in place (deduplication).

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥ 20 | `node --version` |
| Supabase project | Free tier works fine |
| A display server (local GUI) | Only needed when `ZAP_HEADLESS=false` |

---

## Supabase setup

1. Open your Supabase project → **SQL editor**.
2. Paste and run the contents of [`docs/supabase_schema.sql`](supabase_schema.sql).
3. Note your project URL and **service-role** key (Settings → API).

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role secret (never expose this publicly) |
| `ZAP_MAX_PRICE` | – | Stop when last listing price on a page exceeds this BRL value |
| `ZAP_MAX_PAGES` | – | Hard cap on listing pages scraped per run |
| `ZAP_HEADLESS` | – | `true` (default) / `false` to see the browser window |

---

## Running locally

```bash
# Install dependencies
npm install

# Run the ZAP scraper (uses hybrid Crawlee scraper when Supabase vars are set)
npm run scrape:zap

# Or with a price cap
node scrapers/index.js zap 500000

# Visible browser (useful for debugging the modal interaction)
ZAP_HEADLESS=false node scrapers/index.js zap
```

If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are **not set**, `scrapers/index.js`
automatically falls back to the legacy Puppeteer scraper that writes `zapResults.json`.

---

## Running in CI (GitHub Actions)

Add the secrets to your repository (Settings → Secrets → Actions):

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Then reference them in your workflow:

```yaml
- name: Run ZAP scraper
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    ZAP_HEADLESS: "true"
  run: npm run scrape:zap
```

Puppeteer in headless mode needs a few system packages on Ubuntu runners:

```yaml
- name: Install Puppeteer system deps
  run: |
    sudo apt-get update
    sudo apt-get install -y \
      libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

---

## Architecture

```
scrapers/index.js
  └─ zapCrawleeHybrid.js          ← new entry-point
       ├─ CheerioCrawler (LIST)
       │   └─ extracts cards via Cheerio
       │   └─ upserts clean listings to Supabase immediately
       │   └─ enqueues MODAL_PAGE requests for cards with duplicate button
       │
       └─ PuppeteerCrawler (MODAL_PAGE)
           └─ opens listing page once per page
           └─ for each card needing modal:
               └─ clicks button → extracts advertiser links → picks canonical URL
           └─ upserts listings to Supabase

utils/
  urlHelper.js       – normalizeUrl(), slugFromUrl()
  supabaseClient.js  – singleton Supabase client
  supabaseHelper.js  – upsertListing(), upsertListings()

docs/
  supabase_schema.sql  – CREATE TABLE + constraints + RLS
  hybrid-scraper.md    – this file
```

---

## Deduplication logic

A listing is uniquely identified by `(source, listing_url)` where `listing_url`
is the **normalised** URL (see `utils/urlHelper.js`).

Normalisation removes:
- tracking query parameters (`utm_*`, `gclid`, `fbclid`, etc.)
- pagination parameters (`pagina`, `page`)
- trailing slashes
- URL fragments (`#…`)

When the scraper encounters a card with the "duplicate advertisers" modal it:
1. Extracts all advertiser links from the modal.
2. Chooses the **first valid ZAP listing link** as the canonical URL.
3. Stores all advertiser links in the `advertisers` jsonb column.

On subsequent runs, the same canonical URL triggers an upsert that updates
`last_seen_at` and refreshes mutable fields without duplicating the row.
