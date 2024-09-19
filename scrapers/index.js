const olxScraper = require("./olxScraper");

(async () => {
  try {
    await olxScraper();
    console.log("Todos os scrapers foram executados com sucesso.");
  } catch (error) {
    console.error("Erro ao executar os scrapers:", error);
  }
})();
