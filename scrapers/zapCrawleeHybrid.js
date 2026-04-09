/**
 * scrapers/zapCrawleeHybrid.js
 *
 * Hybrid Crawlee scraper for ZAP Imóveis.
 *
 * Flow
 * ────
 * 1. CheerioCrawler fetches each listing page (fast, no browser).
 *    - Extracts card data (address, price, images, link) with Cheerio.
 *    - Detects cards that have the "duplicate advertisers" button.
 *    - Enqueues one MODAL_PAGE request per listing page that has at least
 *      one such card, passing along the set of card links that need the modal.
 *    - Immediately upserts "clean" cards (no modal) to Supabase.
 *
 * 2. PuppeteerCrawler handles MODAL_PAGE requests (browser, low concurrency).
 *    - Navigates to the listing page once per page.
 *    - For every card that needs the modal:
 *        a. Finds the card by its href.
 *        b. Clicks the "deduplicated" button.
 *        c. Extracts advertiser links from the modal.
 *        d. Picks the first valid ZAP link as canonicalUrl.
 *        e. Presses Escape to close the modal.
 *    - Upserts results to Supabase.
 *
 * Environment variables required
 * ───────────────────────────────
 * SUPABASE_URL               – Supabase project URL
 * SUPABASE_SERVICE_ROLE_KEY  – Service-role secret key
 *
 * Optional
 * ────────
 * ZAP_MAX_PRICE  – Stop scraping when the last listing price exceeds this value
 * ZAP_HEADLESS   – Set to "false" to run Puppeteer with a visible window (default: "true")
 * ZAP_MAX_PAGES  – Maximum number of listing pages to scrape (default: unlimited)
 */

"use strict";

const { CheerioCrawler, PuppeteerCrawler, RequestQueue, log } = require("crawlee");
const { createTargetURL } = require("../config/zapConfig");
const { normalizeUrl } = require("../utils/urlHelper");
const { upsertListings } = require("../utils/supabaseHelper");

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE = "zap";

/** Selector for listing cards on a ZAP results page. */
const CARD_SEL = 'li[data-cy="rp-property-cd"]';

/** Selector for the "show duplicate advertisers" button inside a card. */
const DUPLICATE_BTN_SEL = 'button[data-cy="listing-card-deduplicated-button"]';

/** Selectors tried in order to locate an open deduplication modal. */
const MODAL_SELECTORS = [
  'section[data-cy="deduplication-modal-list-step"]',
  'div[role="dialog"]',
  'div[aria-modal="true"]',
  "div.fixed.inset-0",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract card data from a Cheerio element.
 *
 * @param {CheerioAPI} $  - Cheerio root.
 * @param {Element}    el - The <li> card element.
 * @param {number}     idx - Zero-based position on the page.
 * @returns {Object} Extracted card fields.
 */
function extractCard($, el, idx) {
  const $li = $(el);

  // ── link ──
  const rawLink = $li.find("a").first().attr("href") || "";
  const link = rawLink
    ? normalizeUrl(rawLink.startsWith("http") ? rawLink : `https://www.zapimoveis.com.br${rawLink}`)
    : "";

  // ── price ──
  let price = "";
  const priceSelectors = [
    'div[data-cy="rp-cardProperty-price-txt"] p',
    ".text-2-25",
    "p.font-semibold",
  ];
  for (const sel of priceSelectors) {
    const text = $li.find(sel).first().text().trim();
    if (text) {
      price = text.split("\n")[0].replace(/[R$\s.]/g, "").trim();
      break;
    }
  }

  // ── address ──
  let address = "";
  const addressSelectors = [
    '[data-cy="rp-cardProperty-location-txt"]',
    "h2",
    '[data-cy="rp-cardProperty-street-txt"]',
  ];
  for (const sel of addressSelectors) {
    const text = $li.find(sel).first().text().trim();
    if (text) {
      address = text
        .replace(/^(Casa|Apartamento|Im[oó]vel) para (comprar|alugar) em\s*/i, "")
        .trim();
      break;
    }
  }

  // ── images ──
  const images = [];
  const imgSelectors = [
    'div[data-cy="rp-cardProperty-image-img"] ul li img',
    ".olx-core-carousel img",
    "div img",
  ];
  for (const sel of imgSelectors) {
    const found = $li.find(sel).toArray();
    if (found.length) {
      found.forEach((img) => {
        const src = $(img).attr("src");
        if (src) images.push(src);
      });
      break;
    }
  }

  // ── duplicate advertisers flag ──
  const hasDuplicates = $li.find(DUPLICATE_BTN_SEL).length > 0;

  return {
    elementId: `house-item-${idx}`,
    link,
    rawLink,
    address,
    price,
    images,
    hasDuplicates,
  };
}

/**
 * Build the Supabase row shape from a card object and optional modal data.
 *
 * @param {Object}   card
 * @param {string}   canonicalUrl
 * @param {Object[]} [advertisers=[]]
 * @returns {import('../utils/supabaseHelper').ListingRow}
 */
function buildRow(card, canonicalUrl, advertisers = []) {
  return {
    source: SOURCE,
    listing_url: canonicalUrl,
    original_url: card.rawLink
      ? normalizeUrl(
          card.rawLink.startsWith("http")
            ? card.rawLink
            : `https://www.zapimoveis.com.br${card.rawLink}`
        )
      : canonicalUrl,
    address: card.address || null,
    price: card.price || null,
    images: card.images || [],
    advertisers,
    raw: {
      elementId: card.elementId,
      hasDuplicates: card.hasDuplicates,
      scrapedAt: new Date().toISOString(),
    },
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Run the hybrid ZAP scraper.
 *
 * @param {Object} [options]
 * @param {number} [options.maxPrice]  - Stop when last listing exceeds this price.
 * @param {number} [options.maxPages]  - Hard cap on pages scraped.
 * @param {boolean} [options.headless] - Whether Puppeteer runs headless.
 * @returns {Promise<void>}
 */
async function runZapCrawleeHybrid({ maxPrice, maxPages, headless = true } = {}) {
  const queue = await RequestQueue.open("zap-hybrid");

  // Enqueue the first listing page; additional pages are enqueued dynamically.
  await queue.addRequest({
    url: createTargetURL({ pagina: 1 }),
    userData: { label: "LIST", pageNumber: 1 },
    uniqueKey: "LIST-1",
  });

  // ── CheerioCrawler ────────────────────────────────────────────────────────

  const cheerioCrawler = new CheerioCrawler({
    requestQueue: queue,
    maxConcurrency: 3,

    async requestHandler({ request, $ }) {
      if (request.userData.label !== "LIST") return;

      const { pageNumber } = request.userData;
      log.info(`[LIST] Page ${pageNumber}: ${request.url}`);

      const cards = $(CARD_SEL).toArray();
      log.info(`[LIST] Found ${cards.length} cards on page ${pageNumber}`);

      if (cards.length === 0) {
        log.warning(`[LIST] No cards on page ${pageNumber} — stopping pagination.`);
        return;
      }

      // Separate clean cards (no modal) from those that need browser interaction.
      const cleanRows = [];
      const needsModal = [];

      cards.forEach((el, idx) => {
        const card = extractCard($, el, idx);

        if (!card.hasDuplicates) {
          if (card.link) {
            cleanRows.push(buildRow(card, card.link));
          }
        } else {
          // Store enough info so the Puppeteer step can find & click the button.
          needsModal.push({
            elementId: card.elementId,
            rawLink: card.rawLink,
            address: card.address,
            price: card.price,
            images: card.images,
            link: card.link,
            hasDuplicates: true,
          });
        }
      });

      // Persist clean rows immediately.
      if (cleanRows.length > 0) {
        try {
          await upsertListings(cleanRows);
          log.info(`[LIST] Upserted ${cleanRows.length} clean listings from page ${pageNumber}`);
        } catch (err) {
          log.error(`[LIST] Supabase upsert error on page ${pageNumber}: ${err.message}`);
        }
      }

      // Enqueue a browser step for this page if any cards need the modal.
      if (needsModal.length > 0) {
        log.info(`[LIST] ${needsModal.length} card(s) need modal on page ${pageNumber}`);
        await queue.addRequest(
          {
            url: request.url,
            userData: { label: "MODAL_PAGE", pageNumber, needsModal },
            uniqueKey: `MODAL-${pageNumber}`,
          },
          { forefront: false }
        );
      }

      // ── Price cap check ──
      const lastCard = extractCard($, cards[cards.length - 1], cards.length - 1);
      const lastPrice = parseInt(lastCard.price, 10) || 0;
      if (maxPrice && lastPrice >= maxPrice) {
        log.info(`[LIST] Price cap ${maxPrice} reached (last=${lastPrice}). Stopping pagination.`);
        return;
      }

      // ── Page cap check ──
      if (maxPages && pageNumber >= maxPages) {
        log.info(`[LIST] Page cap ${maxPages} reached. Stopping pagination.`);
        return;
      }

      // ── Enqueue next page ──
      const nextPage = pageNumber + 1;
      await queue.addRequest(
        {
          url: createTargetURL({ pagina: nextPage }),
          userData: { label: "LIST", pageNumber: nextPage },
          uniqueKey: `LIST-${nextPage}`,
        },
        { forefront: false }
      );
    },

    async failedRequestHandler({ request, error }) {
      log.error(`[LIST] Request failed: ${request.url} — ${error.message}`);
    },
  });

  // ── PuppeteerCrawler ──────────────────────────────────────────────────────

  const puppeteerCrawler = new PuppeteerCrawler({
    requestQueue: queue,
    maxConcurrency: 1,
    launchContext: {
      launchOptions: {
        headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--window-size=1920,1080",
        ],
        defaultViewport: { width: 1920, height: 1080 },
      },
    },

    async requestHandler({ request, page }) {
      if (request.userData.label !== "MODAL_PAGE") return;

      const { pageNumber, needsModal } = request.userData;
      log.info(`[MODAL] Page ${pageNumber}: processing ${needsModal.length} modal(s)`);

      // Wait for the listing grid to render before interacting.
      try {
        await page.waitForSelector(CARD_SEL, { timeout: 20000 });
      } catch {
        log.warning(`[MODAL] Timed out waiting for cards on page ${pageNumber}`);
        return;
      }

      const rows = [];

      for (const cardInfo of needsModal) {
        log.info(`[MODAL] Processing card ${cardInfo.elementId}`);

        try {
          // ── Locate the card by its link href ──
          let buttonHandle = null;

          if (cardInfo.rawLink) {
            // Find the <li> whose anchor href contains the card's rawLink slug.
            // Use page.evaluate with direct DOM traversal to avoid CSS selector
            // injection from slug characters (hyphens, parentheses, etc.).
            const rawSlug = cardInfo.rawLink.split("/").filter(Boolean).pop();
            if (rawSlug) {
              buttonHandle = await page.evaluateHandle(
                (cardSel, btnSel, slug) => {
                  const cards = Array.from(document.querySelectorAll(cardSel));
                  const matchedCard = cards.find((li) => {
                    const anchor = li.querySelector("a");
                    return anchor && anchor.href && anchor.href.includes(slug);
                  });
                  return matchedCard ? matchedCard.querySelector(btnSel) : null;
                },
                CARD_SEL,
                DUPLICATE_BTN_SEL,
                rawSlug
              );
              // evaluateHandle returns a JSHandle wrapping null when not found.
              if (buttonHandle && (await buttonHandle.jsonValue()) === null) {
                buttonHandle = null;
              }
            }
          }

          // Fallback: take the N-th button on the page (by index).
          if (!buttonHandle) {
            const allButtons = await page.$$(DUPLICATE_BTN_SEL);
            const idx = needsModal.indexOf(cardInfo);
            buttonHandle = allButtons[idx] || allButtons[0] || null;
          }

          if (!buttonHandle) {
            log.warning(`[MODAL] Button not found for ${cardInfo.elementId}, skipping.`);
            // Persist what we have with the link from Cheerio extraction.
            if (cardInfo.link) {
              rows.push(buildRow(cardInfo, cardInfo.link, []));
            }
            continue;
          }

          // ── Click the button ──
          await buttonHandle.click();
          await new Promise((r) => setTimeout(r, 1500));

          // ── Extract advertiser links from the modal ──
          let advertisers = [];

          for (const modalSel of MODAL_SELECTORS) {
            const modalEl = await page.$(modalSel);
            if (!modalEl) continue;

            const links = await modalEl.$$eval("a", (anchors) =>
              anchors.map((a) => ({ href: a.href, text: a.innerText.trim() }))
            );
            if (links.length > 0) {
              advertisers = links;
              break;
            }
          }

          // Filter for valid ZAP listing links.
          const validLinks = advertisers.filter(
            (l) => l.href && l.href.includes("zapimoveis") && l.href.includes("imovel")
          );

          // Choose canonical URL: first valid advertiser link, else original card link.
          const canonicalUrl =
            validLinks.length > 0
              ? normalizeUrl(validLinks[0].href)
              : cardInfo.link || `https://www.zapimoveis.com.br/imovel/${cardInfo.elementId}`;

          rows.push(buildRow(cardInfo, canonicalUrl, validLinks));

          // ── Close the modal ──
          await page.keyboard.press("Escape").catch(() => {});
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          log.error(`[MODAL] Error on card ${cardInfo.elementId}: ${err.message}`);
          if (cardInfo.link) {
            rows.push(buildRow(cardInfo, cardInfo.link, []));
          }
        }
      }

      // Persist all modal results for this page.
      if (rows.length > 0) {
        try {
          await upsertListings(rows);
          log.info(`[MODAL] Upserted ${rows.length} listings from page ${pageNumber}`);
        } catch (err) {
          log.error(`[MODAL] Supabase upsert error on page ${pageNumber}: ${err.message}`);
        }
      }
    },

    async failedRequestHandler({ request, error }) {
      log.error(`[MODAL] Request failed: ${request.url} — ${error.message}`);
    },
  });

  // Run both crawlers concurrently on the shared queue.
  // CheerioCrawler will produce MODAL_PAGE requests that PuppeteerCrawler
  // picks up; each crawler ignores requests labelled for the other.
  log.info("[ZAP] Starting hybrid scraper…");
  await Promise.all([cheerioCrawler.run(), puppeteerCrawler.run()]);
  log.info("[ZAP] Hybrid scraper finished.");
}

// ─── Module export ────────────────────────────────────────────────────────────

/**
 * Entry-point compatible with scrapers/index.js convention.
 * Reads configuration from environment variables with argv fallback.
 *
 * @param {string|number} [maxPriceArg] - Optional max price from CLI argument.
 */
module.exports = async function zapCrawleeHybrid(maxPriceArg) {
  const maxPrice = parseInt(
    maxPriceArg || process.env.ZAP_MAX_PRICE || "0",
    10
  ) || undefined;

  const maxPages = parseInt(process.env.ZAP_MAX_PAGES || "0", 10) || undefined;

  const headless = process.env.ZAP_HEADLESS !== "false";

  await runZapCrawleeHybrid({ maxPrice, maxPages, headless });
};
