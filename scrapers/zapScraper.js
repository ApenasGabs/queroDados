const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { saveJSON, loadJSON } = require("../utils/fileHelper");
const { createTargetURL } = require("../config/zapConfig");
const { simulateInteractions } = require("../utils/interactionsHelper");

const getHouseList = async (page) => {
  return await page.evaluate(() => {
    const filteredItems = Array.from(
      document.querySelectorAll(
        'div.listings-wrapper li[data-cy="rp-property-cd"]'
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

      const images = Array.from(
        li.querySelectorAll(
          'div[data-cy="rp-cardProperty-image-img"] ul li img'
        )
      ).map((img) => img.src);
      const price = card
        .querySelector('div[data-cy="rp-cardProperty-price-txt"] p')
        ?.innerText?.replace(/[R$\s.]/g, "");

      const address = card.querySelector(
        '[data-cy="rp-cardProperty-location-txt"]'
      )?.innerText;
      const duplicatedButton = card.querySelector(
        'button[data-cy="listing-card-deduplicated-button"]'
      );

      const hasDuplicates = duplicatedButton !== null;

      const liId = `house-item-${idx}`;
      li.id = liId;

      const simpleLink = li.querySelector("a")?.href;
      function generatePropertyId() {
        const now = new Date();
        const timestamp = now.getTime();
        const randomSuffix = Math.floor(Math.random() * 1000);

        return `prop_${timestamp}_${randomSuffix}`;
      }
      const house = {
        id: generatePropertyId(),
        address,
        description,
        images,
        link: simpleLink,
        price,
        hasDuplicates,
        scrapedAt: new Date().toISOString(),
        elementId: liId,
      };

      return house;
    });
  });
};

const processDuplicatedLinks = async (page, houses) => {
  for (let i = 0; i < houses.length; i++) {
    const house = houses[i];
    if (house.hasDuplicates) {
      try {
        await page.waitForSelector(
          `#${house.elementId} button[data-cy="listing-card-deduplicated-button"]`
        );
        await page.click(
          `#${house.elementId} button[data-cy="listing-card-deduplicated-button"]`
        );

        await page.waitForSelector(
          'section[data-cy="deduplication-modal-list-step"]',
          { timeout: 5000 }
        );

        const links = await page.evaluate(() => {
          const linksSection = document.querySelector(
            'section[data-cy="deduplication-modal-list-step"]'
          );
          if (!linksSection) return [];
          return Array.from(linksSection.querySelectorAll("a")).map(
            (a) => a.href
          );
        });

        if (links && links.length > 0) {
          house.link = links[0];
        }

        await page.keyboard.press("Escape");

        await page.waitForTimeout(500);
      } catch (error) {
        console.log(
          `Erro ao processar duplicados para casa ${i}:`,
          error.message
        );
      }
    }
  }
  return houses;
};

module.exports = async (maxPrice) => {
  console.log("maxPrice: ", maxPrice);
  const houseList = [];
  let browser;
  let page;
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
      browser = await puppeteer.launch(browserProps);
      page = await browser.newPage();
      console.log(`Acessando página ${pageNumber}`);
      const url = createTargetURL({ pagina: pageNumber });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 0,
      });
      await page.waitForSelector("div.listings-wrapper", {
        timeout: 3000,
      });
      await simulateInteractions(page, "zapInteractionData");

      let newHouses = await getHouseList(page);

      newHouses = await processDuplicatedLinks(page, newHouses);

      console.log("newHouses: ", newHouses);

      if (newHouses.length === 0) {
        console.log("Nenhuma casa encontrada nesta página.");
        throw new Error("A lista de casas está vazia.");
      }

      houseList.push(...newHouses);

      const lastHighPrice = newHouses[newHouses.length - 1]?.price || 0;

      if (parseInt(lastHighPrice) >= maxPrice) {
        console.log("preço final chegou: ", lastHighPrice);
        hasNextPage = false;
      }
      pageNumber++;
      await browser.close();
    }

    console.log("Total de casas encontradas:", houseList.length);

    if (houseList.length > 0) {
      const filePath = path.join(__dirname, "../data/results/zapResults.json");
      await saveJSON(filePath, houseList);
      console.log("Dados atualizados salvos em zapResults.json");
    } else {
      console.log("Nenhuma casa encontrada. JSON não salvo.");
    }
  } catch (error) {
    console.error("Erro durante o scraping:", error);
    if (page) {
      await page.screenshot({
        path: `data/results/erro_zap_${new Date()
          .toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            dateStyle: "long",
            timeStyle: "medium",
          })
          .replace(/[/:,]/g, "-")
          .replace(/ /g, "_")}.png`,
        fullPage: true,
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
