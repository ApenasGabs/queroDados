const puppeteer = require("puppeteer");
const path = require("path");
const { saveJSON, loadJSON } = require("../utils/fileHelper");
const { convertDate } = require("../utils/dateHelper");
const config = require("../config/olxConfig");
const { maxPrice } = require("../config/defaultConfig");

const attributeMapping = {
  quartos: "numberOfRooms",
  "metros quadrados": "floorSize",
  "vagas de garagem": "numberOfParkingSpaces",
  banheiros: "numberOfBathroomsTotal",
};

const getHouseList = async (page) => {
  return await page.evaluate((attributeMapping) => {
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
      const price = li.querySelector(
        'h3[data-ds-component="DS-Text"]'
      )?.innerText;

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
        images: [images.includes("notFound") ? null : images],
        link,
        price,
        publishDate,
      };
      console.log(`${idx + 1} ${house}`);

      return house;
    });
  }, attributeMapping);
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
      newHouses.forEach((house) => {
        house.publishDate = convertDate(house.publishDate);
      });

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

    const filePath = path.join(__dirname, "../data/results/olxResults.json");

    try {
      await saveJSON(filePath, houseList);
      console.log("Dados atualizados salvos em olxResults.json");
    } catch (err) {
      console.error("Erro ao salvar o arquivo:", err);
    }
  }
};
