const olxScraper = require("./olxScraper");
const zapScraper = require("./zapScraper");

(async () => {
  try {
    await olxScraper();
    await zapScraper();
    console.log("Todos os scrapers foram executados com sucesso.");
  } catch (error) {
    console.error("Erro ao executar os scrapers:", error);
  }
})();
