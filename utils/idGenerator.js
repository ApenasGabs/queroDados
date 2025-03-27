/**
 * Gera IDs únicos para propriedades imobiliárias com base no timestamp atual
 * e um sufixo aleatório para garantir unicidade em chamadas no mesmo milissegundo.
 *
 * Formato: `prop_TIMESTAMP_RANDOMSUFFIX`
 */

/**
 * Gera um ID único para uma propriedade imobiliária
 * @returns {string} ID no formato "prop_TIMESTAMP_RANDOMSUFFIX"
 */
function generatePropertyId() {
  const now = new Date();
  const timestamp = now.getTime(); // Timestamp em milissegundos
  const randomSuffix = Math.floor(Math.random() * 1000); // Número entre 0-999

  return `prop_${timestamp}_${randomSuffix}`;
}

/**
 * Gera um ID sequencial baseado em data (formato mais legível)
 * @returns {string} ID no formato "YYYYMMDDHHMMSSmmm"
 */
function generateSequentialId() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    String(now.getMilliseconds()).padStart(3, "0"),
  ].join("");
}

export default {
  generatePropertyId,
  generateSequentialId,
};
