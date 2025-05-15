const { chromium } = require("playwright");
const { createTargetURL } = require("../config/chavConfig");

(async (maxPrice = 300000) => {
  const browserProps = {
    headless: false,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };

  let pageNumber = 1;
  const browser = await chromium.launch(browserProps);
  const page = await browser.newPage();
  const url = createTargetURL({ pagina: pageNumber, maxPrice });
  await page.goto(url);

  const houses = await page.evaluate(() => {
    const houseElements = Array.from(document.querySelectorAll("#listing div"));

    return houseElements.map((house) => {
      const link = house.querySelector("a")?.href;
      const title = house.querySelector("h2")?.textContent.trim();
      const price = house
        .querySelector(".style-module__Yo5w-q__price b")
        ?.textContent.trim();
      const area = house
        .querySelector(".styles-module__aBT18q__body2:first-child")
        ?.textContent.trim();
      const rooms = house
        .querySelector(".styles-module__aBT18q__body2:nth-child(2)")
        ?.textContent.trim();
      const garage = house
        .querySelector(".styles-module__aBT18q__body2:nth-child(3)")
        ?.textContent.trim();
      const bathrooms = house
        .querySelector(".styles-module__aBT18q__body2:nth-child(4)")
        ?.textContent.trim();
      const description = house
        .querySelector(".styles-module__aBT18q__body1")
        ?.textContent.trim();
      const address = house
        .querySelector(".style-module__Yo5w-q__address p:last-child")
        ?.textContent.trim();

      return {
        link,
        title,
        price,
        area,
        rooms,
        garage,
        bathrooms,
        description,
        address,
      };
    });
  });

  console.log("==================");
  console.log("Casas encontradas:", houses.length);
  console.log("Primeira casa:", houses[0]);
  console.log("==================");

  await browser.close();
})();
