const puppeteer = require("puppeteer");
const targetURL =
  "https://www.olx.com.br/imoveis/venda/casas/estado-sp/grande-campinas/campinas?q=casas&sp=1";
const propertyType = "casas";
const propertyMaxPrice = 220000;
const targetURLWithPrice = `https://www.olx.com.br/imoveis/venda/casas/estado-sp/grande-campinas/campinas?f=p&pe=${propertyMaxPrice}&q=${propertyType}&sp=1`;

const getHouseList = async (page) => {
  return await page.evaluate(() => {
    const filteredItems = Array.from(
      document.querySelectorAll(
        'section[data-ds-component="DS-AdCard"].olx-ad-card--horizontal'
      )
    );
    return filteredItems.map((li) => {
      const price = li.querySelector(
        'h3[data-ds-component="DS-Text"]'
      )?.innerText;

      const address = li.querySelector(
        ".olx-ad-card__location-date-container > p"
      )?.innerText;

      const bedrooms = li.querySelector(
        'ul[data-testid="labelGroup"] li span'
      )?.innerText;

      return { address, bedrooms, price };
    });
  });
};

const main = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const houseList = [];
  const page = await browser.newPage();

  try {
    let pageNumber = 1;

    let hasNextPage = true;
    while (hasNextPage) {
      await page.goto(`${targetURLWithPrice}&o=${pageNumber}`);
      pageNumber++;
      const newHouses = await getHouseList(page);
      houseList.push(...newHouses);
      const lastHighPrice = houseList[houseList.length - 1].price.replace(
        /[R$\s.]/g,
        ""
      );
      console.log("lastHighPrice: ", lastHighPrice);
      if (houseList.length && lastHighPrice >= propertyMaxPrice) {
        hasNextPage = false;
      }
    }
  } catch (error) {
  } finally {
    await browser.close();
  }
};

main();
