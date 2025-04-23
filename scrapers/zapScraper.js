const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { saveJSON, loadJSON } = require("../utils/fileHelper");
const { createTargetURL } = require("../config/zapConfig");
const { simulateInteractions } = require("../utils/interactionsHelper");
const { delay } = require("../utils/delayHelper");
const logError = async (message, details = {}) => {
  const logPath = path.join(__dirname, "../data/results/zapErrors.json");
  let logs = [];

  try {
    const existingContent = await fs
      .readFile(logPath, "utf8")
      .catch(() => "[]");
    logs = JSON.parse(existingContent);
  } catch (e) {
    logs = [];
  }

  logs.push({
    timestamp: new Date().toISOString(),
    message,
    details,
  });

  await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
  console.error(`[ERROR LOG] ${message}`);
};

/**
 * @async
 * @function getHouseList
 * @param {Object} page - Objeto da página Puppeteer para interação com o navegador
 * @description Extrai informações de listagens de imóveis do site ZAP Imóveis.
 *
 * O processo de extração ocorre nas seguintes etapas:
 * 1. Expõe uma função de log para mensagens do navegador
 * 2. Extrai dados básicos de cada imóvel através de seletores DOM:
 *    - Identificador único
 *    - Endereço
 *    - Descrição (quartos, banheiros, etc.)
 *    - Imagens
 *    - Link para a página do imóvel
 *    - Preço
 *    - Indicador de duplicação
 *    - Data e hora da extração
 * 3. Processamento especial para imóveis com listagens duplicadas:
 *    - Captura de screenshots antes da interação
 *    - Clique no botão de duplicados
 *    - Tentativa de localizar o modal de duplicados
 *    - Extração de links alternativos
 *    - Salvamento do HTML do modal para depuração
 *    - Atualização do link principal quando duplicados são encontrados
 *
 * @returns {Promise<Array>} Lista de imóveis com todas as informações extraídas
 * @throws {Error} Erros durante o processamento são logados, mas não interrompem a extração
 */
const getHouseList = async (page) => {
  await page.exposeFunction("logFromBrowser", (message) => {
    console.log(`[BROWSER]: ${message}`);
  });

  const basicData = await page.evaluate(() => {
    // Função auxiliar para criar IDs de propriedades
    const generatePropertyId = () => {
      const now = new Date();
      const timestamp = now.getTime();
      const randomSuffix = Math.floor(Math.random() * 1000);
      return `prop_${timestamp}_${randomSuffix}`;
    };

    // Função auxiliar para extrair dados com segurança
    const safeQuerySelector = (parent, selector) => {
      try {
        if (!parent) return null;
        return parent.querySelector(selector);
      } catch (error) {
        console.log(`Erro ao selecionar ${selector}: ${error.message}`);
        return null;
      }
    };

    // Função para extrair descrições, usando múltiplos seletores alternativos
    const getDescriptions = (container) => {
      try {
        if (!container) return [];

        // Lista de seletores a tentar, em ordem de prioridade
        const selectors = [
          '[data-cy^="rp-cardProperty-"]:not([data-cy="rp-cardProperty-tag-txt"])',
          'li[data-cy^="rp-cardProperty-"][data-cy$="-txt"]',
          "ul.flex.flex-row li",
        ];

        // Tenta cada seletor até encontrar resultados
        let elements = [];
        for (const selector of selectors) {
          elements = container.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            console.log(
              `Encontrados ${elements.length} elementos com seletor: ${selector}`
            );
            break;
          }
        }

        // Se não encontrou elementos, retorna array vazio
        if (!elements || elements.length === 0) {
          return [];
        }

        return Array.from(elements).reduce((acc, el) => {
          try {
            const titleSpan = el.querySelector("span.sr-only");
            const title = titleSpan?.innerText?.trim() || "";

            // Se não encontrou o título via span, tenta outras abordagens
            let finalTitle = title;
            if (!finalTitle) {
              // Tenta extrair do atributo data-cy
              const dataCy = el.getAttribute("data-cy") || "";
              if (dataCy && dataCy.includes("rp-cardProperty-")) {
                finalTitle = dataCy
                  .replace("rp-cardProperty-", "")
                  .replace("-txt", "")
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())
                  .trim();
              }
            }

            // Obtém o valor do texto do elemento
            const h3Element = el.querySelector("h3");
            let value = "";

            if (h3Element) {
              // Remove o título do texto para obter apenas o valor
              value = h3Element.innerText?.trim() || "";
              if (title) {
                value = value.replace(title, "").trim();
              }
            } else {
              // Se não tem h3, tenta pegar o texto diretamente do elemento
              value = el.innerText?.trim() || "";
              if (title) {
                value = value.replace(title, "").trim();
              }
            }

            if (finalTitle && value) {
              acc.push({ [finalTitle]: value });
            }
          } catch (innerError) {
            console.log(`Erro ao processar descrição: ${innerError.message}`);
          }
          return acc;
        }, []);
      } catch (error) {
        console.log(`Erro geral ao obter descrições: ${error.message}`);
        return [];
      }
    };

    try {
      // Tenta diferentes seletores para garantir que encontremos os itens
      const selectors = [
        'div.listings-wrapper li[data-cy="rp-property-cd"]',
        'div.listings-wrapper ul li[data-cy="rp-property-cd"]',
        'ul li[data-cy="rp-property-cd"]',
      ];

      let filteredItems = [];
      for (const selector of selectors) {
        const items = document.querySelectorAll(selector);
        if (items && items.length > 0) {
          console.log(
            `Encontrados ${items.length} itens com seletor: ${selector}`
          );
          filteredItems = Array.from(items);
          break;
        }
      }

      if (filteredItems.length === 0) {
        console.log("Não foi possível encontrar nenhum item de propriedade");
        return [];
      }

      return filteredItems
        .map((li, idx) => {
          try {
            // Verifica se li existe
            if (!li) {
              console.log(`Item ${idx} não encontrado`);
              return null;
            }

            // ID para o item atual
            const liId = `house-item-${idx}`;
            li.id = liId;

            // Tenta obter o link, independente do resto da estrutura
            const simpleLink = safeQuerySelector(li, "a")?.href || "";

            // Busca card com verificação de nulo, usando seletores alternativos
            let card = null;
            const cardSelectors = [
              'div[data-testid="card"]',
              ".flex.flex-col.content-stretch",
              ".flex.flex-col.grow",
            ];

            for (const selector of cardSelectors) {
              card = safeQuerySelector(li, selector);
              if (card) break;
            }

            // Se não encontrar card, retorna objeto parcial, mas com as informações que conseguimos
            if (!card) {
              console.log(
                `Card não encontrado para o item ${idx}, usando informações parciais`
              );
              return {
                id: generatePropertyId(),
                elementId: liId,
                link: simpleLink,
                hasDuplicates: false,
                incomplete: true,
                scrapedAt: new Date().toISOString(),
              };
            }

            // Extrair descrições, seja do card ou do li
            const description =
              getDescriptions(card) || getDescriptions(li) || [];

            // Obter imagens com segurança, tentando vários seletores
            let images = [];
            const imageSelectors = [
              'div[data-cy="rp-cardProperty-image-img"] ul li img',
              ".olx-core-carousel img",
              "div img",
            ];

            for (const selector of imageSelectors) {
              const imgElements = li.querySelectorAll(selector);
              if (imgElements && imgElements.length > 0) {
                images = Array.from(imgElements)
                  .map((img) => img.src || "")
                  .filter(Boolean);
                break;
              }
            }

            // Obter preço com segurança, tentando vários seletores
            let price = "";
            const priceSelectors = [
              'div[data-cy="rp-cardProperty-price-txt"] p',
              ".text-2-25",
              "p.font-semibold",
            ];

            for (const selector of priceSelectors) {
              const priceElement =
                card?.querySelector(selector) || li?.querySelector(selector);
              if (priceElement?.innerText) {
                price = priceElement.innerText.replace(/[R$\s.]/g, "");
                break;
              }
            }

            // Obter endereço com segurança
            let address = "";
            const addressSelectors = [
              '[data-cy="rp-cardProperty-location-txt"]',
              "h2",
              'p[data-cy="rp-cardProperty-street-txt"]',
            ];

            for (const selector of addressSelectors) {
              const addressElement =
                card?.querySelector(selector) || li?.querySelector(selector);
              if (addressElement?.innerText) {
                address = addressElement.innerText.trim();
                break;
              }
            }

            // Verificar duplicados com segurança
            let hasDuplicates = false;
            const duplicateSelectors = [
              'button[data-cy="listing-card-deduplicated-button"]',
              'button:contains("Ver os")',
            ];

            for (const selector of duplicateSelectors) {
              if (
                card?.querySelector(selector) ||
                li?.querySelector(selector)
              ) {
                hasDuplicates = true;
                break;
              }
            }

            return {
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
          } catch (error) {
            console.log(`Erro ao processar item ${idx}: ${error.message}`);
            return null;
          }
        })
        .filter(Boolean); // Remove itens nulos
    } catch (outerError) {
      console.log(`Erro geral ao processar itens: ${outerError.message}`);
      return [];
    }
  });

  const results = [];
  for (const house of basicData) {
    if (house.hasDuplicates) {
      console.log("hasDuplicates: ", house);
      try {
        await page.screenshot({
          path: `data/results/debug_pre_click_${house.elementId}.png`,
          fullPage: false,
        });

        await page.click(
          `#${house.elementId} button[data-cy="listing-card-deduplicated-button"]`
        );

        await delay();

        await page.screenshot({
          path: `data/results/debug_post_click_${house.elementId}.png`,
          fullPage: false,
        });

        let found = false;
        let attempts = 0;
        let finalHtml = "";
        let modalLinks = [];

        while (!found && attempts < 10) {
          attempts++;
          console.log(`Tentativa ${attempts} para encontrar o modal...`);

          const evalResult = await page.evaluate(async () => {
            console.log("Executando avaliação para buscar modal...");

            await window.logFromBrowser("Buscando modal no DOM...");

            const selectors = [
              'section[data-cy="deduplication-modal-list-step"]',
              'div[role="dialog"]',
              "section.modal-list",
              '[data-cy*="deduplication"]',
            ];

            let foundElement = null;
            let html = "";
            let links = [];

            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element) {
                await window.logFromBrowser(
                  `Encontrado elemento com seletor: ${selector}`
                );
                foundElement = selector;
                html = element.outerHTML;

                const anchorElements = element.querySelectorAll("a");
                if (anchorElements.length > 0) {
                  links = Array.from(anchorElements).map((a) => ({
                    href: a.href,
                    text: a.innerText.trim(),
                  }));
                  await window.logFromBrowser(
                    `Encontrados ${links.length} links no modal!`
                  );
                } else {
                  await window.logFromBrowser(
                    "Nenhum link encontrado no elemento."
                  );
                }

                break;
              }
            }

            if (!foundElement) {
              await window.logFromBrowser(
                "Modal não encontrado com seletores específicos"
              );
              html = document.body.innerHTML;

              const allLinks = document.querySelectorAll("a");
              const relevantLinks = Array.from(allLinks)
                .filter((a) => {
                  const href = a.href.toLowerCase();
                  const text = a.innerText.toLowerCase();
                  return (
                    href.includes("imovel") ||
                    text.includes("imovel") ||
                    href.includes("apartamento") ||
                    text.includes("apartamento") ||
                    href.includes("casa") ||
                    text.includes("casa")
                  );
                })
                .map((a) => ({
                  href: a.href,
                  text: a.innerText.trim(),
                }));

              if (relevantLinks.length > 0) {
                links = relevantLinks;
                await window.logFromBrowser(
                  `Encontrados ${links.length} links potencialmente relevantes na página.`
                );
              }
            }

            return { found: !!foundElement, html, links };
          });

          console.log(`Resultado da tentativa ${attempts}:`, {
            found: evalResult.found,
            linksCount: evalResult.links.length,
          });

          if (evalResult.found || evalResult.links.length > 0) {
            found = true;
            finalHtml = evalResult.html;
            modalLinks = evalResult.links;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        if (finalHtml) {
          const htmlPath = `data/results/modal_html_${house.elementId}.html`;
          await fs.writeFile(htmlPath, finalHtml);
          console.log(`HTML do modal salvo em: ${htmlPath}`);
        }

        console.log("Links encontrados:", modalLinks);

        if (modalLinks.length > 0) {
          house.link = modalLinks[0].href;
          console.log(`Link atualizado para: ${house.link}`);
        }

        try {
          await page.keyboard.press("Escape");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (closeError) {
          console.log(`Erro ao fechar modal: ${closeError.message}`);
        }
      } catch (error) {
        console.error(
          `Erro ao processar duplicados para ${house.elementId}:`,
          error
        );
      }
    }
    results.push(house);
  }

  return results;
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

      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 0,
        });

        try {
          await page.waitForSelector("div.listings-wrapper", {
            timeout: 10000,
          });
        } catch (selectorError) {
          await logError(
            `Falha ao encontrar div.listings-wrapper ${selectorError}`,
            {
              page: pageNumber,
              url,
              errorMessage: selectorError.message,
            }
          );

          const hasContent = await page.evaluate(() => {
            return document.body.innerText.length > 100;
          });

          if (!hasContent) {
            throw new Error("Página sem conteúdo suficiente");
          }

          await delay(5000);
        }

        await simulateInteractions(page, "zapInteractionData");

        let newHouses = await getHouseList(page);

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
      } catch (pageError) {
        await logError(`Erro ao processar página ${pageNumber}, ${pageError}`, {
          url,
          errorMessage: pageError.message,
        });

        if (page) {
          const screenshotPath = `data/results/erro_zap_pagina_${pageNumber}_${new Date()
            .toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "short",
              timeStyle: "short",
            })
            .replace(/[/:,]/g, "-")
            .replace(/ /g, "_")}.png`;

          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
          });

          await logError("Screenshot salvo", { path: screenshotPath });
        }

        pageNumber++;
        if (browser) await browser.close();
        continue;
      }
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
    await logError("Erro geral durante o scraping", {
      errorMessage: error.message,
      stack: error.stack,
    });

    if (page) {
      const screenshotPath = `data/results/erro_zap_${new Date()
        .toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          dateStyle: "long",
          timeStyle: "medium",
        })
        .replace(/[/:,]/g, "-")
        .replace(/ /g, "_")}.png`;

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      await logError("Screenshot salvo", { path: screenshotPath });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
