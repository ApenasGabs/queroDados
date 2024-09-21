const baseUrl = "https://www.zapimoveis.com.br/venda/casas/sp+campinas/";

const createTargetURL = ({
  transacao = "venda",
  estado = "São Paulo",
  cidade = "Campinas",
  latitude,
  longitude,
  tipos = "casa_residencial",
  pagina = 1,
  ordem = "Menor preço",
} = {}) => {
  let targetURL = `${baseUrl}?`;

  targetURL += `transacao=${encodeURIComponent(transacao)}&`;

  const onde = `,${encodeURIComponent(estado)},${encodeURIComponent(
    cidade
  )},,,,,city,BR>Sao Paulo>NULL>${encodeURIComponent(cidade)}${
    latitude ? `,${latitude}` : ""
  }${longitude ? `,${longitude}` : ""},`;
  targetURL += `onde=${encodeURIComponent(onde)}&`;

  targetURL += `tipos=${encodeURIComponent(tipos)}&pagina=${encodeURIComponent(
    pagina
  )}&ordem=${encodeURIComponent(ordem)}`;

  return targetURL;
};

module.exports = {
  createTargetURL,
};
