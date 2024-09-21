const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { saveJSON, loadJSON } = require("../utils/fileHelper");
// const { convertDate } = require("../utils/dateHelper");
const { createTargetURL } = require("../config/zapConfig");
const { maxPrice } = require("../config/defaultConfig");

const getHouseList = async (page) => {
  return await page.evaluate(() => {
    const filteredItems = Array.from(
      document.querySelectorAll(
        'div.listing-wrapper__content div[data-testid="card"]'
      )
    );

    return filteredItems.map((li, idx) => {
      const description = Array.from(
        li.querySelectorAll('p[data-testid="card-amenity"]')
      ).reduce((acc, el) => {
        const key = el.getAttribute("itemprop");
        const value = el.innerText;
        acc[key] = value;
        return acc;
      }, {});

      const price = li.querySelector(
        'div[data-cy="rp-cardProperty-price-txt"] p'
      )?.innerText;

      const address = li.querySelector(
        'h2[data-cy="rp-cardProperty-location-txt"]'
      )?.innerText;
      const duplicatedButton = li.querySelector(
        'button[data-cy="rp-cardProperty-duplicated-button"]'
      );
      if (duplicatedButton) {
        console.log("duplicatedButton: ", duplicatedButton);
      }

      const link = li.querySelector("a")?.href;

      // const publishDate = li.querySelector()?.innerText;

      const house = {
        address,
        description,
        link,
        price,
      };
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
      const url = createTargetURL({ pagina: pageNumber });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
      });
      const newHouses = await getHouseList(page);
      console.log("newHouses: ", newHouses);

      if (newHouses.length === 0) {
        console.log("Nenhuma casa encontrada nesta página.");
        break;
      }

      houseList.push(...newHouses);

      const lastHighPrice =
        newHouses[newHouses.length - 1]?.price?.replace(/[R$\s.]/g, "") || 0;

      if (parseInt(lastHighPrice) >= maxPrice) {
        hasNextPage = false;
      }

      pageNumber++;
    }

    console.log("Total de casas encontradas:", houseList.length);
  } catch (error) {
    console.error("Erro durante o scraping:", error);
  } finally {
    await browser.close();

    const filePath = path.join(__dirname, "../data/results/zapResults.json");

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
