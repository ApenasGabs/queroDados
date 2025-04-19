# Guia para Desenvolvedores

Este documento descreve como configurar o ambiente de desenvolvimento, contribuir para o projeto e realizar tarefas comuns de manutenção.

## 📋 Índice

- [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
- [Fluxo de Trabalho](#fluxo-de-trabalho)
- [Padrões de Código](#padrões-de-código)
- [Testes](#testes)
- [Atualizando os Scrapers](#atualizando-os-scrapers)
- [Integração com o Repositório Alvo](#integração-com-o-repositório-alvo)
- [Troubleshooting para Desenvolvedores](#troubleshooting-para-desenvolvedores)

## 🛠️ Ambiente de Desenvolvimento

### Pré-requisitos

- Node.js 20.x ou superior
- Git
- Ubuntu/Debian ou WSL para Windows
- Editor de código (recomendado: VSCode)

### Configuração Inicial

1. Clone o repositório:

   ```bash
   git clone https://github.com/ApenasGabs/scraping-grupo-olx.git
   cd scraping-grupo-olx
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Instale as dependências do sistema para o Puppeteer:

   ```bash
   sudo apt-get update
   sudo apt-get install -y xvfb libxss1 libgtk-3-0 libnotify-dev libnss3 libx11-xcb1
   ```

4. Configure o arquivo `.env`:

   ```bash
   cp .env.example .env
   ```

   Edite o arquivo `.env` com suas configurações locais.

5. Crie pastas necessárias:

   ```bash
   mkdir -p data/results logs
   ```

### Scripts Úteis

O projeto inclui vários scripts no `package.json` para facilitar o desenvolvimento:

- `npm run scrape`: Executa ambos os scrapers
- `npm run scrape:olx`: Executa apenas o scraper OLX
- `npm run scrape:zap`: Executa apenas o scraper ZAP
- `npm run lint`: Verifica problemas de código com ESLint
- `npm run test`: Executa testes

## 🔄 Fluxo de Trabalho

1. **Atualize sua branch:**

   ```bash
   git checkout main
   git pull origin main
   ```

2. **Crie uma branch para sua feature/fix:**

   ```bash
   git checkout -b feature/nome-da-feature
   # ou
   git checkout -b fix/nome-do-bug
   ```

3. **Faça as alterações necessárias**

4. **Teste suas mudanças localmente:**

   ```bash
   npm run scrape
   ```

5. **Verifique se o código segue os padrões:**

   ```bash
   npm run lint
   ```

6. **Commit suas alterações:**

   ```bash
   git add .
   git commit -m "feat: descrição da sua alteração"
   ```

7. **Push para o GitHub:**

   ```bash
   git push origin feature/nome-da-feature
   ```

8. **Crie um Pull Request** para a branch `main`

## 📏 Padrões de Código

Este projeto segue o padrão de commits do Conventional Commits e utiliza o ESLint para garantir a qualidade do código.

### Conventional Commits

Os commits devem seguir o padrão:

```
<tipo>(<escopo opcional>): <descrição>
```

Tipos comuns:

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças na documentação
- `style`: Formatação, ponto e vírgula faltando, etc.
- `refactor`: Refatoração de código
- `test`: Adição ou correção de testes
- `chore`: Alterações em ferramentas de build, dependências, etc.

### Estilo de Código

- Use 2 espaços para indentação
- Linhas com no máximo 100 caracteres
- Use aspas duplas para strings
- Adicione ponto e vírgula ao final das declarações
- Prefira arrow functions (`const fn = () => {}`)
- Use destructuring quando possível

## 🧪 Testes

### Executando Testes

```bash
npm run test
```

### Adicionando Novos Testes

Os testes estão localizados na pasta `tests/`. Para adicionar novos testes:

1. Crie um arquivo com o nome `[feature].test.js`
2. Siga o padrão existente para novos testes
3. Execute os testes para garantir que passam

## 🔄 Atualizando os Scrapers

Os sites alvo podem mudar sua estrutura HTML ao longo do tempo, exigindo atualizações nos scrapers.

### Sinais de que o Scraper Precisa de Atualização

- Erros em série na pipeline
- Dados incompletos ou incorretos
- Timeout ao esperar por seletores

### Processo de Atualização

1. **Analise o site manualmente**:
   - Abra o site em um navegador
   - Use as ferramentas de desenvolvedor (F12) para inspecionar os elementos

2. **Identifique as mudanças**:
   - Compare os seletores CSS atuais com a nova estrutura
   - Identifique novos campos ou campos removidos

3. **Atualize o código**:
   - Modifique os seletores em `olxScraper.js` ou `zapScraper.js`
   - Atualize a lógica de extração conforme necessário

4. **Teste localmente**:

   ```bash
   npm run scrape:olx  # ou scrape:zap
   ```

5. **Verifique os dados extraídos**:

   ```bash
   cat data/results/olxResults.json | jq .
   # ou
   cat data/results/zapResults.json | jq .
   ```

## 🔄 Integração com o Repositório Alvo

Este projeto envia dados para o repositório QueroCAsa através de Pull Requests automáticos.

### Fluxo de Integração

1. Os scrapers coletam dados
2. A pipeline processa e merge os dados
3. Um PR é criado para a branch `api` do repositório alvo
4. Após aprovação, os dados são integrados

### Testando a Integração Localmente

Se você precisar testar o fluxo completo localmente:

1. Clone o repositório alvo:

   ```bash
   git clone https://github.com/user/querocasa.git
   ```

2. Execute os scrapers e gere os arquivos JSON:

   ```bash
   # No diretório do scraper
   npm run scrape
   ```

3. Copie os resultados para o repositório alvo:

   ```bash
   cp data/results/*.json ../querocasa/data/results/
   ```

4. Execute os scripts de processamento:

   ```bash
   # No diretório do repositório alvo
   node scripts/mergeResults.js
   ```

## 🔧 Troubleshooting para Desenvolvedores

### Recuperando de Falhas no Scraper

Se o scraper falhar repetidamente:

1. **Verifique as dependências do Puppeteer**:

   ```bash
   sudo apt-get install -y xvfb libxss1 libgtk-3-0 libnotify-dev libnss3 libx11-xcb1
   ```

2. **Ajuste o tempo de espera**:
   Aumente os tempos de timeout em `zapScraper.js` ou `olxScraper.js`:

   ```javascript
   await page.waitForSelector("elemento", { timeout: 20000 });
   ```

3. **Execute em modo não-headless**:
   Modifique `browserProps` para:

   ```javascript
   const browserProps = {
     headless: false,
     // outras configurações...
   };
   ```

4. **Adicione mais logs**:

   ```javascript
   console.log("Debug elemento:", await page.evaluate(() => {
     return document.querySelector("elemento") ? "encontrado" : "não encontrado";
   }));
   ```

### Corrigindo Problemas de Dependências

Se houver problemas com dependências:

```bash
rm -rf node_modules
npm cache clean --force
npm install
```

### Monitoramento e Logs

Para adicionar mais logs detalhados quando estiver debugando:

```javascript
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Detalhes:', objeto);
}
```

Execute com:

```bash
DEBUG=true node scrapers/index.js zap 1000000
```
