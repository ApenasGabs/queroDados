const olxScraper = require("./olxScraper");
const zapScraper = require("./zapScraper");

const scraperType = process.argv[2];
const maxPrice = process.argv[3];

// Use the Crawlee-based hybrid scraper for ZAP when Supabase credentials are
// present; otherwise fall back to the legacy Puppeteer scraper that writes JSON.
const hasSupabaseConfig =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  try {
    if (scraperType === "olx") {
      await olxScraper(maxPrice);
      console.log("OLX scraper executado com sucesso.");
    } else if (scraperType === "zap") {
      if (hasSupabaseConfig) {
        let zapCrawleeHybrid;
        try {
          // Lazy-require so that the Supabase client is only instantiated when
          // credentials are available — avoids a hard crash at startup.
          zapCrawleeHybrid = require("./zapCrawleeHybrid");
        } catch (requireErr) {
          console.error(
            "[ERROR] Não foi possível carregar o scraper Crawlee/Supabase. " +
              "Verifique se as dependências estão instaladas (npm install) e se " +
              "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão corretas.\n" +
              requireErr.message
          );
          process.exit(1);
        }
        await zapCrawleeHybrid(maxPrice);
        console.log("Zap Crawlee hybrid scraper executado com sucesso.");
      } else {
        console.warn(
          "[WARN] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados. " +
            "Usando scraper legado (JSON)."
        );
        await zapScraper(maxPrice);
        console.log("Zap scraper (legado) executado com sucesso.");
      }
    } else {
      console.log("Por favor, passe 'olx' ou 'zap' como argumento.");
    }
  } catch (error) {
    console.error("Erro ao executar o scraper:", error);
  }
})();
