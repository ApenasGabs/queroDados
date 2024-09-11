const puppeteer = require("puppeteer");
const targetURl =
  "https://www.olx.com.br/imoveis/venda/casas/estado-sp/grande-campinas/campinas?q=casas&sp=1s";
const propertyType = "casas";
const propertyMaxPrice = 500000;
// const propertyType = "casas" | "apartamentos";
const targetURlWithPrice = `https://www.olx.com.br/imoveis/venda/casas/estado-sp/grande-campinas/campinas?f=p&pe=${propertyMaxPrice}&q=${propertyType}&sp=1`;

const main = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    // userDataDir: "/tmp/myChromeSession",
  });
  debugger;
  const page = await browser.newPage();
  const houseList = [];
  try {
    await page.goto(targetURlWithPrice);
    // await page.goto(targetURlWithPrice, { waitUntil: "networkidle0" });

    const houseList = await page.evaluate(() => {
      // Seleciona os elementos desejados
      const filteredItens = Array.from(
        document.querySelectorAll(
          'section[data-ds-component="DS-AdCard"].olx-ad-card--horizontal'
        )
      );

      return filteredItens.map((li) => {
        const price = li.querySelector(
          'h3[data-ds-component="DS-Text"]'
        )?.innerText;
        console.log("price: ", price);

        const address = li.querySelector(
          ".olx-ad-card__location-date-container > p"
        )?.innerText;
        console.log("address: ", address);

        const bedrooms = li.querySelector(
          'ul[data-testid="labelGroup"] li span'
        )?.innerText;

        console.log("bedrooms: ", bedrooms);
        return { price, address, bedrooms };
      });
    });
    console.log("houseList: ", houseList);
    houseList.forEach((house) => {
      console.log("house: ", house);
    });
  } catch (error) {
    console.log("error: ", error);
  }
};
main();
