# Guia de Resolução de Problemas

Este guia oferece soluções para problemas comuns encontrados durante a execução dos scrapers e da pipeline de automação.

## Problemas Comuns de Scraping

### 1. Timeout ao Esperar por Seletores

**Problema**: O scraper falha com erro de timeout ao esperar por um seletor específico.

```
TimeoutError: waiting for selector 'div.listings-wrapper' failed: timeout 3000ms exceeded
```

**Soluções**:

- Aumentar o tempo de timeout:

  ```javascript
  await page.waitForSelector("div.listings-wrapper", { timeout: 10000 });
  ```

- Usar setTimeout como alternativa:

  ```javascript
  await new Promise(resolve => setTimeout(resolve, 5000));
  ```

- Implementar verificação de conteúdo alternativa:

  ```javascript
  const hasContent = await page.evaluate(() => {
    return document.body.innerText.length > 100;
  });
  ```

### 2. Site Detectando Automação

**Problema**: O site detecta que você está usando um bot e bloqueia o acesso.

**Soluções**:

- Ative as simulações de interação humana:

  ```javascript
  await simulateInteractions(page, "zapInteractionData");
  ```

- Adicione delays aleatórios entre ações:

  ```javascript
  await page.waitForTimeout(Math.random() * 1000 + 500);
  ```

- Configure o navegador de forma menos detectável:

  ```javascript
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--window-size=1980,1280'
    ]
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  ```

### 3. Dados Incorretos ou Ausentes

**Problema**: O scraper está funcionando, mas extrai dados incompletos ou incorretos.

**Soluções**:

- Verifique se os seletores CSS ainda são válidos:

  ```
  Abra o site manualmente, use as ferramentas de desenvolvedor para confirmar 
  se os seletores atuais ainda funcionam
  ```

- Atualize os seletores conforme necessário
- Adicione mais logging para entender quais partes estão falhando:

  ```javascript
  console.log("Tentando extrair elemento:", await page.evaluate(() => {
    return document.querySelector('div.listings-wrapper') ? 'existe' : 'não existe';
  }));
  ```

## Problemas da Pipeline

### 1. JSON Inválido

**Problema**: A pipeline falha na verificação de JSON.

**Soluções**:

- Adicione validação de JSON antes de salvar:

  ```javascript
  try {
    JSON.parse(JSON.stringify(data)); // Testa se serializa/deserializa corretamente
    await saveJSON(filePath, data);
  } catch (error) {
    console.error("Dados inválidos:", error);
    // Salva uma versão sanitizada ou vazia
  }
  ```

- Mantenha backup dos dados quando a pipeline falhar:

  ```bash
  if [ ! -f "$file" ] || [ ! -s "$file" ]; then
    echo "⚠️ Arquivo $file ausente ou vazio - usar dados anteriores"
    cp "../querocasa/data/results/${file}" . || echo "[]" > "$file"
  fi
  ```

### 2. Falhas em Série

**Problema**: Ambos os scrapers falham, resultando em nenhum dado novo.

**Soluções**:

- Implemente sistema para manter dados antigos:

  ```bash
  if [ -f "../querocasa/data/results/${file}" ]; then
    echo "Copiando dados antigos para uso no merge"
    cp "../querocasa/data/results/${file}" .
  else
    echo "[]" > "$file"
  fi
  ```

- Adicione notificações quando falhas em série acontecem:

  ```yaml
  - name: Notify failure
    if: failure()
    run: |
      curl -X POST -H "Content-Type: application/json" \
      -d '{"text":"⚠️ Pipeline de scraping falhou!"}' \
      ${{ secrets.NOTIFICATION_WEBHOOK }}
  ```

### 3. Recursos Insuficientes no Runner

**Problema**: A execução falha por falta de memória ou tempo limite excedido.

**Soluções**:

- Aumente os limites de timeout no workflow:

  ```yaml
  timeout-minutes: 45
  ```

- Otimize o uso de memória:

  ```javascript
  // Feche páginas quando não estiverem em uso
  if (browser) await browser.close();
  
  // Use browser contexts para melhor gerenciamento de memória
  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  // ... após usar
  await context.close();
  ```

## Problemas de Integração

### 1. Pull Request Não Criado

**Problema**: A pipeline executa com sucesso mas o PR não é criado.

**Soluções**:

- Verifique os tokens de acesso:

  ```
  Confirme que o TOKEN_REPO_PAT tem permissões para criar PRs
  ```

- Verifique os logs do job `download-and-update-repo`
- Certifique-se de que o branch base existe:

  ```bash
  cd querocasa
  git fetch origin
  git checkout -b api origin/api || git checkout -b api
  ```

### 2. Erros no Merge

**Problema**: O processo de merge falha ou perde dados.

**Soluções**:

- Verifique a estrutura dos arquivos JSON antes e depois:

  ```bash
  jq 'length' before.json
  jq 'length' after.json
  ```

- Implemente validação mais rigorosa:

  ```javascript
  if (newData.length === 0 && oldData.length > 0) {
    console.log("⚠️ Novos dados estão vazios, usando dados antigos");
    return oldData;
  }
  ```

## Como Obter Mais Informação para Debug

### 1. Screenshots de Erro

Os scrapers já possuem mecanismo para capturar screenshots. Verifique a pasta:

```
/data/results/*.png
```

### 2. Aumentar Nível de Log

Adicione mais logs detalhados modificando os arquivos principais:

```javascript
// Início de cada função importante
console.log("[DEBUG] Iniciando função X com parâmetros:", param1, param2);

// Durante operações críticas
console.log("[DEBUG] Estado atual:", { variavel1, variavel2 });

// Ao final da operação
console.log("[DEBUG] Operação concluída, resultado:", resultado);
```

### 3. Execução Manual

Para depurar localmente sem a pipeline:

```bash
# Execute com Node debugger
node --inspect scrapers/index.js zap 1000000

# Ou com console.log detalhado
DEBUG=true node scrapers/index.js olx 1000000
```

## Quando Atualizar Seletores

Os sites de imóveis costumam atualizar suas interfaces, exigindo atualização dos seletores. Sinais de que é hora de atualizar:

1. Aumento repentino de erros de timeout
2. Scraper funciona mas retorna arrays vazios
3. Dados incorretos (preços zerando, endereços faltando)

**Como atualizar**:

1. Abra o site manualmente
2. Use as ferramentas de desenvolvedor (F12)
3. Inspecione os elementos relevantes
4. Atualize os seletores em `olxScraper.js` ou `zapScraper.js`
