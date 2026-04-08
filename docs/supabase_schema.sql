-- ============================================================
-- Supabase schema for the queroDados scraper
-- ============================================================
-- Run this migration once in the Supabase SQL editor or with
-- the Supabase CLI:
--   supabase db push  (if you add this file to supabase/migrations/)
-- ============================================================

-- Enable the pgcrypto extension for gen_random_uuid() if not already enabled.
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- listings
-- ------------------------------------------------------------
create table if not exists listings (
  id            uuid        primary key default gen_random_uuid(),

  -- Data source ("zap", "olx", …)
  source        text        not null,

  -- Canonical, normalised listing URL used as the natural unique key.
  -- See utils/urlHelper.js → normalizeUrl() for the normalisation rules.
  listing_url   text        not null,

  -- Raw URL as first extracted (may contain tracking parameters).
  original_url  text,

  address       text,
  price         text,

  -- JSON arrays stored as jsonb for efficient querying.
  images        jsonb       not null default '[]'::jsonb,
  advertisers   jsonb       not null default '[]'::jsonb,

  -- Full raw scraped object kept for debugging / re-processing.
  raw           jsonb,

  -- Timestamps managed by the application layer (upsert sets last_seen_at).
  -- first_seen_at is set once on INSERT and never overwritten.
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Unique constraint that drives upsert deduplication.
-- The application calls .upsert({ onConflict: 'source,listing_url' }).
alter table listings
  add constraint if not exists listings_source_listing_url_key
  unique (source, listing_url);

-- Index to speed up lookups by source and recency.
create index if not exists listings_source_last_seen_idx
  on listings (source, last_seen_at desc);

-- ------------------------------------------------------------
-- Row-Level Security (optional but recommended)
-- ------------------------------------------------------------
-- Enable RLS so the service-role key bypasses it while anon/authenticated
-- roles are denied by default.
alter table listings enable row level security;

-- Deny all access to the anon role (public API key).
-- The scraper uses the service-role key which bypasses RLS entirely.
create policy if not exists "deny_anon_listings"
  on listings
  for all
  to anon
  using (false);
