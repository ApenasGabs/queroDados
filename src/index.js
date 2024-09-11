const puppeteer = require("puppeteer");
const targetURL =
  "https://www.olx.com.br/imoveis/venda/casas/estado-sp/grande-campinas/campinas?q=casas&sp=1";
const propertyType = "casas";
const propertyMaxPrice = 500000;
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

const goToNextPage = async (page) => {
  const nextButtonSelector = document.querySelector(
    'div#listing-pagination a[aria-label="Próxima página"]'
  );
  const nextButton = await page.click(nextButtonSelector);
  if (nextButton) {
    await Promise.all([
      // page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click(nextButtonSelector),
    ]);
    return true;
  }
  return false;
};

const main = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const houseList = [];
  const page = await browser.newPage();

  try {
    await page.goto(targetURLWithPrice);

    let hasNextPage = true;
    while (hasNextPage) {
      const newHouses = await getHouseList(page);
      houseList.push(...newHouses);
      console.log("houseList: ", houseList);

      hasNextPage = await goToNextPage(page);
    }
  } catch (error) {
    console.log("error: ", error);
  } finally {
    await browser.close();
  }
};

main();
