# OLX Scraper

## Visão Geral

Este scraper coleta dados de imóveis da plataforma OLX, navegando por várias páginas até atingir o preço máximo definido. O script extrai informações como preço, endereço, descrição, data de publicação e links para imagens.

## Funcionalidades Principais

- Navegação paginada de resultados de busca
- Extração de dados dos cards de imóveis
- Padronização de atributos para formato consistente
- Conversão de datas relativas para formato ISO
- Tratamento básico de erros com screenshots

## Configuração

O scraper utiliza configurações definidas em `config/olxConfig.js`:

```javascript
module.exports = {
  baseURL: "https://www.olx.com.br",
  targetURLWithPrice: "https://pe.olx.com.br/grande-recife/recife/imoveis/venda",
  // outras configurações...
};
```

## Mapeamento de Atributos

O scraper inclui um mapeamento de atributos para converter os termos da OLX para um formato padronizado:

```javascript
const attributeMapping = {
  quartos: "numberOfRooms",
  "metros quadrados": "floorSize",
  "vagas de garagem": "numberOfParkingSpaces",
  banheiros: "numberOfBathroomsTotal",
};
```

## Fluxo de Execução

1. **Inicialização**:
   - Configuração do navegador Puppeteer
   - Definição de variáveis de controle

2. **Loop de Paginação**:
   - Para cada página de resultados:
     - Carregar a página usando a URL base mais parâmetro de paginação
     - Extrair dados dos cards de imóveis
     - Processar e converter datas de publicação

3. **Processamento dos Dados**:
   - Conversão dos atributos para formato padronizado
   - Filtragem de imagens vazias ou placeholder
   - Geração de IDs únicos para cada propriedade

4. **Tratamento de Erros**:
   - Captura de screenshots para facilitar a depuração
   - Controle para evitar salvar JSONs vazios

## Estrutura de Dados Coletados

Os dados são armazenados em formato JSON com a seguinte estrutura:

```json
[
  {
    "id": "prop_1650123456789_123",
    "address": "Boa Viagem, Recife - PE",
    "description": [
      {"numberOfRooms": "3"},
      {"floorSize": "80"},
      {"numberOfParkingSpaces": "1"},
      {"numberOfBathroomsTotal": "2"}
    ],
    "images": ["https://url-da-imagem.jpg"],
    "link": "https://pe.olx.com.br/grande-recife/imoveis/apartamento-a-venda-em-boa-viagem-123456789",
    "price": "450000",
    "scrapedAt": "2025-04-19T12:34:56.789Z",
    "publishDate": "2025-04-15T00:00:00.000Z"
  }
]
```

## Gerenciamento de Falhas

### Estratégias Implementadas

- **Verificação de Lista Vazia**: Lança erro quando nenhum imóvel é encontrado
- **Screenshots Automáticos**: Captura o estado da página em caso de erro
- **Verificação de Preço**: Interrompe a paginação quando o preço máximo é atingido
- **Tratamento de Imagens**: Filtra imagens placeholder ou não encontradas

### Erros Comuns

1. **Lista de casas vazia**:

   ```
   A lista de casas está vazia
   ```

   **Solução**: Verificar se a estrutura HTML do site mudou ou se o site implementou bloqueios anti-bot

2. **Erro de seleção de elementos**:

   ```
   Cannot read properties of null (reading 'innerText')
   ```

   **Solução**: Revisar os seletores CSS usados para extrair dados

3. **Problemas de conexão**:

   ```
   net::ERR_CONNECTION_RESET
   ```

   **Solução**: Implementar mecanismos de retry e espera entre requisições

## Extras

### Conversão de Datas

O scraper utiliza o módulo `dateHelper` para converter datas relativas (como "Hoje, 10:30" ou "Ontem, 15:45") para o formato ISO:

```javascript
// Exemplo de conversão
house.publishDate = convertDate(house.publishDate);
```

### Interações Simuladas (Comentado)

O código inclui referências comentadas para o uso do módulo `interactionsHelper`, que pode ser usado para simular interações humanas e evitar detecção de bot:

```javascript
// const { simulateInteractions } = require("../utils/interactionsHelper");
// await simulateInteractions(page, "olxInteractionData");
```

## Dependências Principais

- **Puppeteer**: Automação do navegador
- **fileHelper**: Utilitários para manipulação de arquivos
- **dateHelper**: Funções para padronização de datas
- **olxConfig**: Configurações específicas para OLX
