const olxScraper = require("./olxScraper");
const zapScraper = require("./zapScraper");
const chavScraper = require("./chavScraper");

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
    } else if (scraperType === "chav") {
      await chavScraper(maxPrice);
      console.log("Chav scraper executado com sucesso.");
    } else {
      console.log("Por favor, passe 'olx', 'zap' ou 'chav' como argumento.");
    }
  } catch (error) {
    console.error("Erro ao executar o scraper:", error);
  }
})();
