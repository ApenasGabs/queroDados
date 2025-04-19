# ZAP Imóveis Scraper

## Visão Geral

Este scraper coleta dados de imóveis do site ZAP Imóveis, processando múltiplas páginas até atingir o preço máximo definido. Ele extrai informações como preço, endereço, descrição e links para imagens.

## Funcionalidades Principais

- Navegação entre páginas de resultados
- Extração de dados dos cards de imóveis
- Processamento de links duplicados
- Registro de erros com screenshots
- Tratamento de recuperação de falhas

## Configuração

O scraper utiliza configurações definidas em `config/zapConfig.js`:

```javascript
module.exports = {
  baseURL: "https://www.zapimoveis.com.br",
  createTargetURL: ({ pagina = 1 }) => {
    return `https://www.zapimoveis.com.br/venda/apartamentos/pe+recife/?pagina=${pagina}`;
  },
  // outras configurações...
};
```

## Fluxo de Execução

1. **Inicialização**:
   - Configuração do navegador Puppeteer
   - Definição de variáveis de controle

2. **Loop de Paginação**:
   - Para cada página de resultados:
     - Carregar a página
     - Aguardar pelo seletor `div.listings-wrapper` ou implementar fallback
     - Simular interações humanas para evitar detecção de bot
     - Extrair dados dos cards de imóveis

3. **Processamento de Duplicados**:
   - Para imóveis com botão de duplicados:
     - Clicar no botão de duplicados
     - Extrair links alternativos
     - Selecionar o link principal

4. **Tratamento de Erros**:
   - Registro de erros em arquivo JSON (`zapErrors.json`)
   - Captura de screenshots para depuração
   - Tentativas de recuperação quando possível

## Estrutura de Dados Coletados

Os dados são armazenados em formato JSON com a seguinte estrutura:

```json
[
  {
    "id": "prop_1650123456789_123",
    "address": "Boa Viagem, Recife - PE",
    "description": [
      {"bedrooms": "3"},
      {"bathrooms": "2"},
      {"parkingSpaces": "1"},
      {"usableArea": "80"}
    ],
    "images": ["https://url-da-imagem1.jpg", "https://url-da-imagem2.jpg"],
    "link": "https://www.zapimoveis.com.br/imovel/venda-apartamento-3-quartos-boa-viagem-recife/ID-12345",
    "price": "450000",
    "hasDuplicates": true,
    "scrapedAt": "2025-04-19T12:34:56.789Z",
    "elementId": "house-item-0"
  }
]
```

## Gerenciamento de Falhas

### Estratégias Implementadas

- **Timeout Aumentado**: 10 segundos para esperar carregamento completo
- **Verificações Alternativas**: Verifica conteúdo da página mesmo sem seletores específicos
- **Logs Detalhados**: Registra erros com detalhes para diagnóstico
- **Screenshots Automáticas**: Captura o estado da página em caso de erro
- **Continuidade**: Continua para próxima página mesmo em caso de falha na atual

### Erros Comuns

1. **Timeout ao carregar seletores**:

   ```
   Falha ao encontrar div.listings-wrapper
   ```

   **Solução**: Aumentar timeout ou implementar verificações alternativas

2. **Lista de casas vazia**:

   ```
   A lista de casas está vazia
   ```

   **Solução**: Verificar se o site alterou estrutura HTML ou implementou proteções anti-bot

3. **Erro em duplicados**:

   ```
   Erro ao processar duplicados
   ```

   **Solução**: Rever seletores para modal de duplicados, que podem ter mudado

## Dependências Principais

- **Puppeteer**: Automação do navegador
- **fileHelper**: Utilitários para manipulação de arquivos
- **interactionsHelper**: Simulação de comportamento humano
- **zapConfig**: Configurações específicas para ZAP Imóveis
