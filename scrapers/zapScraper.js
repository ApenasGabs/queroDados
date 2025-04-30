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

            // Limpar os textos da descrição, especialmente o campo Location
            const cleanedDescription = description.map((descObj) => {
              const key = Object.keys(descObj)[0];
              let value = descObj[Object.keys(descObj)[0]];

              // Se for um campo de localização, limpar o prefixo "Casa para comprar em"
              if (key === "Location" && value) {
                value = value.replace(
                  /^(Casa|Apartamento|Imóvel) para (comprar|alugar) em\n/i,
                  ""
                );
              }

              // Se for campo de preço, remover informações de IPTU
              if (key === "Price" && value) {
                value = value.split("\n")[0].trim();
              }

              return { [key]: value };
            });

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
                // Pega apenas o primeiro valor de preço (antes do IPTU)
                const priceText = priceElement.innerText.split("\n")[0];
                price = priceText.replace(/[R$\s.]/g, "");
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
                // Remove "Casa para comprar em\n" e textos similares
                address = addressElement.innerText
                  .trim()
                  .replace(
                    /^(Casa|Apartamento|Imóvel) para (comprar|alugar) em\n/i,
                    ""
                  );
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
              description: cleanedDescription,
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
    // Se o imóvel tem link vazio e hasDuplicates, vamos garantir que ele tenha um link padrão
    if (!house.link && house.hasDuplicates) {
      const defaultLink = `https://www.zapimoveis.com.br/imovel/${house.elementId}`;
      house.link = defaultLink;
      console.log(`Definido link padrão para imóvel sem link: ${defaultLink}`);
    }

    if (house.hasDuplicates) {
      console.log("hasDuplicates: ", house);
      try {
        await page.screenshot({
          path: `data/results/debug_pre_click_${house.elementId}.png`,
          fullPage: false,
        });

        // Verificar se o botão de duplicados existe antes de clicar
        const buttonExists = await page.evaluate((elementId) => {
          const element = document.querySelector(
            `#${elementId} button[data-cy="listing-card-deduplicated-button"]`
          );
          if (element) {
            return true;
          }

          // Tenta alternativas caso o seletor principal não funcione
          const alternativeSelectors = [
            `#${elementId} button:contains("Ver os")`,
            `#${elementId} button:contains("duplicado")`,
            `#${elementId} [data-cy*="deduplicated"]`,
          ];

          for (const selector of alternativeSelectors) {
            const altElement = document.querySelector(selector);
            if (altElement) return true;
          }

          return false;
        }, house.elementId);

        if (!buttonExists) {
          console.log(
            `Botão de duplicados não encontrado para ${house.elementId}, pulando.`
          );
          results.push(house);
          continue;
        }

        // Tentar clicar usando várias abordagens
        try {
          await page.click(
            `#${house.elementId} button[data-cy="listing-card-deduplicated-button"]`
          );
        } catch (clickError) {
          console.log(
            `Erro ao clicar no botão padrão: ${clickError.message}, tentando alternativas`
          );

          // Tenta clicar usando JavaScript diretamente
          await page.evaluate((elementId) => {
            const element = document.querySelector(
              `#${elementId} button[data-cy="listing-card-deduplicated-button"]`
            );
            if (element) element.click();

            // Tenta alternativas
            const alternatives = [
              document.querySelector(`#${elementId} button:contains("Ver os")`),
              document.querySelector(
                `#${elementId} button:contains("duplicado")`
              ),
              document.querySelector(`#${elementId} [data-cy*="deduplicated"]`),
            ];

            for (const alt of alternatives) {
              if (alt) alt.click();
            }
          }, house.elementId);
        }

        await delay(2000); // Aumenta o tempo de espera para garantir que o modal apareça

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

            // Seletores expandidos para tentar encontrar o modal de qualquer forma
            const selectors = [
              'section[data-cy="deduplication-modal-list-step"]',
              'div[role="dialog"]',
              "section.modal-list",
              '[data-cy*="deduplication"]',
              ".modal",
              '[class*="modal"]',
              '[id*="modal"]',
              'div[aria-modal="true"]',
              "div.fixed.inset-0", // Common pattern for modal overlays
              "div.fixed.flex.items-center.justify-center",
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

            // Se não encontrou o modal com seletores específicos,
            // procura links relevantes em toda a página que podem ter aparecido
            if (!foundElement) {
              await window.logFromBrowser(
                "Modal não encontrado com seletores específicos, buscando links relevantes"
              );
              html = document.body.innerHTML;

              // Prioriza links que apareceram recentemente na página (possível modal)
              const allLinks = Array.from(
                document.querySelectorAll("a[href*='zapimoveis']")
              );
              const relevantLinks = allLinks
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
                  isVisible: a.offsetParent !== null, // check visibility
                  position: {
                    top: a.getBoundingClientRect().top,
                    left: a.getBoundingClientRect().left,
                  },
                }))
                .sort((a, b) => {
                  // Prioriza links visíveis
                  if (a.isVisible && !b.isVisible) return -1;
                  if (!a.isVisible && b.isVisible) return 1;
                  return 0;
                });

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

        // Se temos links no modal, atualizamos o link do imóvel com o primeiro link válido
        if (modalLinks.length > 0) {
          // Filtra apenas links válidos do ZAP Imóveis e com href
          const validLinks = modalLinks.filter(
            (link) =>
              link.href &&
              link.href.includes("zapimoveis") &&
              link.href.includes("imovel")
          );

          if (validLinks.length > 0) {
            house.link = validLinks[0].href;
            console.log(`Link atualizado para: ${house.link}`);
          } else {
            console.log(
              `Não foram encontrados links válidos para ${house.elementId}`
            );
          }
        } else if (!house.link || house.link.trim() === "") {
          // Fallback: se não temos links do modal e o link atual está vazio, definimos um link padrão
          house.link = `https://www.zapimoveis.com.br/imovel/${house.elementId}`;
          console.log(`Link fallback definido: ${house.link}`);
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

        // Mesmo com erro, garantimos que o imóvel tenha um link
        if (!house.link || house.link.trim() === "") {
          house.link = `https://www.zapimoveis.com.br/imovel/${house.elementId}`;
          console.log(`Link fallback após erro definido: ${house.link}`);
        }
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
