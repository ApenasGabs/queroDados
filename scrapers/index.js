const olxScraper = require("./olxScraper");
const zapScraper = require("./zapScraper");

const scraperType = process.argv[2];
const maxPrice = process.argv[3];

(async () => {
  try {
    if (scraperType === "olx") {
      await olxScraper(maxPrice);
      console.log("OLX scraper executado com sucesso.");
    } else if (scraperType === "zap") {
      await zapScraper(maxPrice);
      console.log("Zap scraper executado com sucesso.");
    } else {
      console.log("Por favor, passe 'olx' ou 'zap' como argumento.");
    }
  } catch (error) {
    console.error("Erro ao executar o scraper:", error);
  }
})();
