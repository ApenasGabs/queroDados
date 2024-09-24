const path = require("path");
const { loadJSON } = require("./fileHelper");

const simulateInteractions = async (page) => {
  const filePath = path.join(__dirname, "./data/interactionData.json");

  const interactionData = await loadJSON(filePath);

  const { scroll, mouse } = interactionData;

  for (let i = 0; i < scroll.length || i < mouse.length; i++) {
    if (i < scroll.length) {
      const { top, timestamp: scrollTimestamp } = scroll[i];
      const nextScrollTimestamp =
        i < scroll.length - 1 ? scroll[i + 1].timestamp : scrollTimestamp;
      const scrollWaitTime = nextScrollTimestamp - scrollTimestamp;

      await page.evaluate((top) => {
        window.scrollTo(0, top);
      }, top);

      await new Promise((resolve) => setTimeout(resolve, scrollWaitTime));
    }

    if (i < mouse.length) {
      const { x, y, timestamp: mouseTimestamp } = mouse[i];
      const nextMouseTimestamp =
        i < mouse.length - 1 ? mouse[i + 1].timestamp : mouseTimestamp;
      const mouseWaitTime = nextMouseTimestamp - mouseTimestamp;

      await page.mouse.move(x, y);
      await new Promise((resolve) => setTimeout(resolve, mouseWaitTime));
    }
  }
};
module.exports = {
  simulateInteractions,
};
