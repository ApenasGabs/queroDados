const olxScraper = require("./olxScraper");
const zapScraper = require("./zapScraper");

const scraperType = process.argv[2];

(async () => {
  try {
    if (scraperType === "olx") {
      await olxScraper();
      console.log("OLX scraper executado com sucesso.");
    } else if (scraperType === "zap") {
      await zapScraper();
      console.log("Zap scraper executado com sucesso.");
    } else {
      console.log("Por favor, passe 'olx' ou 'zap' como argumento.");
    }
  } catch (error) {
    console.error("Erro ao executar o scraper:", error);
  }
})();
