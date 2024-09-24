const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { saveJSON, loadJSON } = require("../utils/fileHelper");
const { createTargetURL } = require("../config/zapConfig");
const { maxPrice } = require("../config/defaultConfig");
const { simulateInteractions } = require("../utils/interactionsHelper");

const getHouseList = async (page) => {
  return await page.evaluate(() => {
    const filteredItems = Array.from(
      document.querySelectorAll(
        "div.listing-wrapper__content div[data-position]"
      )
    );

    return filteredItems.map((li, idx) => {
      const card = li.querySelector('div[data-testid="card"]');
      const description = Array.from(
        card.querySelectorAll('p[data-testid="card-amenity"]')
      ).reduce((acc, el) => {
        const key = el.getAttribute("itemprop");
        const value = el.innerText.split(" ").shift();
        acc.push({ [key]: value });
        return acc;
      }, []);

      const price = card.querySelector(
        'div[data-cy="rp-cardProperty-price-txt"] p'
      )?.innerText;

      const address = card.querySelector(
        'h2[data-cy="rp-cardProperty-location-txt"]'
      )?.innerText;
      const duplicatedButton = card.querySelector(
        'button[data-cy="rp-cardProperty-duplicated-button"]'
      );
      if (duplicatedButton) {
        console.log("duplicatedButton: ", duplicatedButton);
      }

      const link = li.querySelector("a")?.href;

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
  const houseList = [];
  try {
    let pageNumber = 1;
    let hasNextPage = true;
    const browserProps = {
      headless: false,
      defaultViewport: { width: 1980, height: 1280 },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--window-size=1980,1280",
      ],
    };
    while (hasNextPage) {
      const browser = await puppeteer.launch(browserProps);
      const page = await browser.newPage();
      console.log(`Acessando página ${pageNumber}`);
      const url = createTargetURL({ pagina: pageNumber });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 0,
      });
      await page.waitForSelector(
        'div.listing-wrapper__content div[data-testid="card"]',
        {
          timeout: 30000,
        }
      );
      await simulateInteractions(page);

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
        console.log("preço final chegou: ", lastHighPrice);
        hasNextPage = false;
      }
      pageNumber++;
      await browser.close();
    }

    console.log("Total de casas encontradas:", houseList.length);
  } catch (error) {
    console.error("Erro durante o scraping:", error);
  } finally {
    const filePath = path.join(__dirname, "../data/results/zapResults.json");

    try {
      // let existingHouses = await loadJSON(filePath);

      // for (let newHouse of houseList) {
      //   const houseExists = existingHouses.some(
      //     (house) =>
      //       house.link === newHouse.link && house.price === newHouse.price
      //   );
      //   if (!houseExists) {
      //     existingHouses.push(newHouse);
      //   }
      // }

      await saveJSON(filePath, houseList);
      console.log("Dados atualizados salvos em zapResults.json");
    } catch (err) {
      console.error("Erro ao salvar o arquivo:", err);
    }
  }
};
