const fs = require("fs").promises;

async function saveJSON(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Dados salvos em ${filePath}`);
  } catch (error) {
    console.error("Erro ao salvar JSON:", error);
  }
}

async function loadJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return [];
  }
}

module.exports = {
  saveJSON,
  loadJSON,
};
