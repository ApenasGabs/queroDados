/**
 * URL normalization utilities for deduplicating listing URLs.
 * Strips tracking/session query parameters, trailing slashes, and
 * normalises the scheme + hostname so the same physical listing
 * always maps to the same canonical string.
 */

/**
 * Query-string keys that are tracking/pagination artefacts and must be
 * removed before storing the canonical URL.
 */
const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "referrer",
  "session",
  "pagina",
  "page",
  "origem",
  "position",
]);

/**
 * Normalise a listing URL so that the same physical page always yields the
 * same string regardless of tracking parameters, trailing slashes or minor
 * scheme/host differences.
 *
 * @param {string} rawUrl - The URL to normalise.
 * @returns {string} The canonical URL string, or the original value when
 *   parsing fails.
 */
function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;

  let url;
  try {
    // Resolve relative paths against the ZAP base URL.
    url = new URL(rawUrl, "https://www.zapimoveis.com.br");
  } catch {
    return rawUrl;
  }

  // Force HTTPS and lowercase the host.
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();

  // Strip tracking / irrelevant query parameters.
  for (const key of STRIP_PARAMS) {
    url.searchParams.delete(key);
  }

  // Remove trailing slash from pathname (keep the root "/" intact).
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  // Remove the fragment — it is never relevant for deduplication.
  url.hash = "";

  return url.toString();
}

/**
 * Extract a short, human-readable slug from a listing URL.
 * Used as a fallback identifier when no other stable ID is available.
 *
 * @param {string} rawUrl
 * @returns {string}
 */
function slugFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, "https://www.zapimoveis.com.br");
    // e.g. /imovel/venda-residencial-casa-3-quartos-jardim-proenca-campinas-sp-92m2-id-2765025928/
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || url.pathname;
  } catch {
    return rawUrl;
  }
}

module.exports = { normalizeUrl, slugFromUrl };
