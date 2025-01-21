const puppeteer = require("puppeteer");
const path = require("path");
const { saveJSON } = require("../utils/fileHelper");
const { convertDate } = require("../utils/dateHelper");
const config = require("../config/olxConfig");
// const { simulateInteractions } = require("../utils/interactionsHelper");
const attributeMapping = {
  quartos: "numberOfRooms",
  "metros quadrados": "floorSize",
  "vagas de garagem": "numberOfParkingSpaces",
  banheiros: "numberOfBathroomsTotal",
};

const getHouseList = async (page) => {
  // await simulateInteractions(page, "olxInteractionData");
  return await page.evaluate(async (attributeMapping) => {
    const filteredItems = Array.from(
      document.querySelectorAll(
        'section[data-ds-component="DS-AdCard"].olx-ad-card--horizontal'
      )
    );
    return filteredItems.map((li, idx) => {
      const description = Array.from(
        li.querySelectorAll('ul[data-testid="labelGroup"] li span')
      )
        .map((el) => el.getAttribute("aria-label"))
        .reduce((acc, item) => {
          const parts = item.split(" ");
          const value = parts.shift();
          const key = parts.join(" ");
          const attributeKey = Object.keys(attributeMapping).find((k) =>
            key.includes(k)
          );
          if (attributeKey) {
            acc.push({ [attributeMapping[attributeKey]]: `${value}` });
          }
          return acc;
        }, []);
      const images = li.querySelector("img").src;
      const price = li
        .querySelector('h3[data-ds-component="DS-Text"]')
        ?.innerText?.replace(/[R$\s.]/g, "");

      const address = li.querySelector(
        ".olx-ad-card__location-date-container > p"
      )?.innerText;

      const link = li.querySelector(
        'a[data-ds-component="DS-NewAdCard-Link"]'
      )?.href;

      const publishDate = li.querySelector(
        'p[data-testid="ds-adcard-date"]'
      )?.innerText;

      const house = {
        address,
        description,
        images:
          images.includes("notFound") || images.includes("no-photo")
            ? []
            : [images],
        link,
        price,
        publishDate,
      };
      console.log(`${idx + 1} ${house}`);

      return house;
    });
  }, attributeMapping);
};

module.exports = async (maxPrice) => {
  const houseList = [];
  let browser;
  let page;
  try {
    let pageNumber = 1;
    let hasNextPage = true;
    const browserProps = {
      headless: false,
      defaultViewport: null,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    browser = await puppeteer.launch(browserProps);
    page = await browser.newPage();

    while (hasNextPage) {
      console.log(`Acessando página ${pageNumber}`);
      await page.goto(`${config.targetURLWithPrice}&o=${pageNumber}`, {
        waitUntil: "domcontentloaded",
      });

      const newHouses = await getHouseList(page);

      if (newHouses.length === 0) {
        console.log("Nenhuma casa encontrada nesta página.");
        throw new Error("A lista de casas está vazia.");
      }
      newHouses.forEach((house) => {
        house.publishDate = convertDate(house.publishDate);
      });

      houseList.push(...newHouses);

      const lastHighPrice = newHouses[newHouses.length - 1]?.price || 0;

      if (parseInt(lastHighPrice) >= maxPrice) {
        hasNextPage = false;
      }

      pageNumber++;
    }

    console.log("Total de casas encontradas:", houseList.length);

    if (houseList.length > 0) {
      const filePath = path.join(__dirname, "../data/results/olxResults.json");
      await saveJSON(filePath, houseList);
      console.log("Dados atualizados salvos em olxResults.json");
    } else {
      console.log("Nenhuma casa encontrada. JSON não salvo.");
    }
  } catch (error) {
    console.error("Erro durante o scraping:", error);
    if (page) {
      await page.screenshot({
        path: `data/results/error_screenshot_${Date.now()}.png`,
        fullPage: true,
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
