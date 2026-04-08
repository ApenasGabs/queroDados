/**
 * Supabase persistence helpers for the ZAP scraper.
 *
 * All writes go to the `listings` table via an upsert that deduplicates on
 * the (source, listing_url) unique constraint defined in the schema.
 */

const supabase = require("./supabaseClient");

/**
 * @typedef {Object} ListingRow
 * @property {string}  source        - Data source identifier (e.g. "zap").
 * @property {string}  listing_url   - Canonical (normalised) URL — unique key.
 * @property {string}  [original_url] - Raw URL as first seen.
 * @property {string}  [address]
 * @property {string}  [price]
 * @property {Array}   [images]      - Array of image URLs.
 * @property {Array}   [advertisers] - Array of advertiser link objects.
 * @property {Object}  [raw]         - Full scraped object for debugging.
 */

/**
 * Upsert a single listing into the `listings` table.
 *
 * Uses the (source, listing_url) unique constraint so that re-running the
 * scraper updates `last_seen_at` rather than inserting a duplicate row.
 *
 * @param {ListingRow} listing
 * @returns {Promise<Object>} The upserted row returned by Supabase.
 * @throws {Error} If the Supabase call fails.
 */
async function upsertListing(listing) {
  const now = new Date().toISOString();

  const row = {
    source: listing.source || "zap",
    listing_url: listing.listing_url,
    original_url: listing.original_url || listing.listing_url,
    address: listing.address || null,
    price: listing.price || null,
    images: listing.images || [],
    advertisers: listing.advertisers || [],
    raw: listing.raw || null,
    last_seen_at: now,
  };

  const { data, error } = await supabase
    .from("listings")
    .upsert(row, {
      onConflict: "source,listing_url",
      // Do NOT overwrite first_seen_at — the column default handles it and
      // the upsert merge keeps the original value via ignoreDuplicates: false.
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  return data;
}

/**
 * Upsert multiple listings in a single batch call.
 *
 * Rows are deduped on (source, listing_url). Already-existing rows have
 * their `last_seen_at` updated and other mutable fields overwritten.
 *
 * @param {ListingRow[]} listings
 * @returns {Promise<Object[]>} Array of upserted rows.
 * @throws {Error} If the Supabase call fails.
 */
async function upsertListings(listings) {
  if (!listings || listings.length === 0) return [];

  const now = new Date().toISOString();

  const rows = listings.map((listing) => ({
    source: listing.source || "zap",
    listing_url: listing.listing_url,
    original_url: listing.original_url || listing.listing_url,
    address: listing.address || null,
    price: listing.price || null,
    images: listing.images || [],
    advertisers: listing.advertisers || [],
    raw: listing.raw || null,
    last_seen_at: now,
  }));

  const { data, error } = await supabase
    .from("listings")
    .upsert(rows, { onConflict: "source,listing_url" })
    .select();

  if (error) {
    throw new Error(`Supabase batch upsert failed: ${error.message}`);
  }

  return data || [];
}

module.exports = { upsertListing, upsertListings };
