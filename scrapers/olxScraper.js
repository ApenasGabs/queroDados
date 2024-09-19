const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { saveJSON, loadJSON } = require("../utils/fileHelper");
const config = require("../config/olxConfig");

const getHouseList = async (page) => {
  return await page.evaluate(() => {
    const filteredItems = Array.from(
      document.querySelectorAll(
        'section[data-ds-component="DS-AdCard"].olx-ad-card--horizontal'
      )
    );
    return filteredItems.map((li, idx) => {
      const price = li.querySelector(
        'h3[data-ds-component="DS-Text"]'
      )?.innerText;

      const address = li.querySelector(
        ".olx-ad-card__location-date-container > p"
      )?.innerText;

      const bedrooms = li.querySelector(
        'ul[data-testid="labelGroup"] li span'
      )?.innerText;

      const link = li.querySelector(
        'a[data-ds-component="DS-NewAdCard-Link"]'
      )?.href;

      const publishDate = li.querySelector(
        'p[data-testid="ds-adcard-date"]'
      )?.innerText;

      const house = { address, bedrooms, link, price, publishDate };
      console.log(`${idx + 1} ${house}`);

      return house;
    });
  });
};

module.exports = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const houseList = [];
  const page = await browser.newPage();

  try {
    let pageNumber = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`Acessando página ${pageNumber}`);
      await page.goto(`${config.targetURLWithPrice}&o=${pageNumber}`, {
        waitUntil: "domcontentloaded",
      });

      const newHouses = await getHouseList(page);

      if (newHouses.length === 0) {
        console.log("Nenhuma casa encontrada nesta página.");
        break;
      }

      houseList.push(...newHouses);

      const lastHighPrice =
        newHouses[newHouses.length - 1]?.price?.replace(/[R$\s.]/g, "") || 0;

      if (parseInt(lastHighPrice) >= config.maxPrice) {
        hasNextPage = false;
      }

      pageNumber++;
    }

    console.log("Total de casas encontradas:", houseList.length);
  } catch (error) {
    console.error("Erro durante o scraping:", error);
  } finally {
    await browser.close();

    const filePath = path.join(__dirname, "../data/results/olxResults.json");

    try {
      let existingHouses = await loadJSON(filePath);

      for (let newHouse of houseList) {
        const houseExists = existingHouses.some(
          (house) =>
            house.link === newHouse.link && house.price === newHouse.price
        );
        if (!houseExists) {
          existingHouses.push(newHouse);
        }
      }

      await saveJSON(filePath, existingHouses);
      console.log("Dados atualizados salvos em olxResults.json");
    } catch (err) {
      console.error("Erro ao salvar o arquivo:", err);
    }
  }
};
