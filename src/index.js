const puppeteer = require("puppeteer");
const maxPrice = 500000
const targetURLWithPrice = `https://www.olx.com.br/imoveis/venda/casas/estado-sp/grande-campinas/campinas?f=p&pe=${maxPrice}&q=casas&sp=1`;
const fs = require("fs").promises;
const path = require("path");

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

const main = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const houseList = [];
  const page = await browser.newPage();

  try {
    let pageNumber = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`Acessando página ${pageNumber}`);
      await page.goto(`${targetURLWithPrice}&o=${pageNumber}`, {
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

    const filePath = path.join(__dirname, "results.json");

    try {
      let existingHouses = [];
      try {
        const data = await fs.readFile(filePath, "utf-8");
        existingHouses = JSON.parse(data);
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
        existingHouses = [];
      }

      for (let newHouse of houseList) {
        const houseExists = existingHouses.some(
          (house) =>
            house.link === newHouse.link && house.price === newHouse.price
        );
        if (!houseExists) {
          existingHouses.push(newHouse);
        }
      }

      await fs.writeFile(filePath, JSON.stringify(existingHouses, null, 2));
      console.log("Dados atualizados salvos em results.json");
    } catch (err) {
      console.error("Erro ao salvar o arquivo:", err);
    }
  }
};

main();
