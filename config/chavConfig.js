const createTargetURL = ({
  estadoSlug = "sp",
  cidadeSlug = "campinas",
  maxPrice,
  pagina = 1,
  orderByPrice = true,
} = {}) => {
  const baseUrl = "https://www.chavesnamao.com.br/casas-a-venda";

  let url = `${baseUrl}/${estadoSlug}-${cidadeSlug}/?`;

  const filtroParts = [];
  if (orderByPrice) filtroParts.push("or:1");
  if (maxPrice) filtroParts.push(`pmax:${maxPrice}`);

  if (filtroParts.length > 0) {
    const filtroParam = encodeURIComponent(filtroParts.join(","));
    url += `filtro=${filtroParam}&`;
  }

  url += `pg=${pagina}`;

  return url;
};
module.exports = {
  createTargetURL,
};
