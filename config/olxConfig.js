const { maxPrice } = require("./defaultConfig");

const targetURLWithPrice = `https://www.olx.com.br/imoveis/venda/casas/estado-sp/grande-campinas/campinas?f=p&pe=${maxPrice}&q=casas&sp=1`;

module.exports = {
  targetURLWithPrice,
};
