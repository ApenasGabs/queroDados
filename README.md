# Scraper de Imóveis - ZAP e OLX

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/ApenasGabs/scraping-grupo-olx/scrape.yml?label=Pipeline%20de%20Scraping)

Sistema automatizado de coleta e processamento de dados imobiliários do ZAP Imóveis e OLX para o projeto QueroCAsa.

## 📝 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Configuração](#configuração)
- [Execução Local](#execução-local)
- [Pipeline CI/CD](#pipeline-cicd)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Resolução de Problemas](#resolução-de-problemas)
- [Contribuição](#contribuição)

## 🔎 Visão Geral

Este projeto é responsável por extrair automaticamente dados imobiliários das plataformas ZAP Imóveis e OLX, processar essas informações e disponibilizá-las em um formato padronizado para o projeto QueroCAsa. O processo é totalmente automatizado através de uma pipeline CI/CD no GitHub Actions.

### Principais Características

- Scraping automático das plataformas ZAP e OLX
- Normalização e padronização dos dados
- Registro de erros com capturas de tela para depuração
- Geração automática de estatísticas e relatórios
- Submissão automática de atualizações via Pull Requests

## 🏗️ Arquitetura

![Diagrama de Arquitetura](docs/images/architecture_diagram.png)

Nossa arquitetura está dividida em:

1. **Scrapers**: Módulos específicos para cada plataforma (ZAP e OLX)
2. **Pipeline CI/CD**: Workflow automatizado no GitHub Actions
3. **Processamento de Dados**: Scripts para mesclagem e validação
4. **Repositório Alvo**: Destino final dos dados processados

Para mais detalhes, consulte [Documentação de Arquitetura](docs/architecture.md).

## 📋 Requisitos

- Node.js 20 ou superior
- NPM 9 ou superior
- Dependências do Puppeteer:

  ```bash
  sudo apt-get install -y xvfb libxss1 libgtk-3-0 libnotify-dev libnss3 libx11-xcb1
  ```

## 🛠️ Configuração

1. Clone o repositório:

   ```bash
   git clone https://github.com/ApenasGabs/scraping-grupo-olx.git
   cd scraping-grupo-olx
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

   Edite o arquivo `.env` com suas configurações.

## 🚀 Execução Local

Para executar os scrapers localmente:

```bash
# Criar diretório para resultados
mkdir -p data/results

# Executar scraper OLX
node scrapers/index.js olx 500000  # O número é o preço máximo

# Executar scraper ZAP
node scrapers/index.js zap 500000  # O número é o preço máximo

# Executar ambos
npm run scrape
```

## 🔄 Pipeline CI/CD

A pipeline de CI/CD é executada automaticamente:

- Diariamente às 04:40 UTC
- Em push para a branch main
- Manualmente via GitHub Actions

O processo inclui:

1. Execução paralela dos scrapers ZAP e OLX
2. Armazenamento dos resultados como artefatos
3. Download e processamento dos artefatos
4. Mesclagem com dados existentes
5. Geração de um Pull Request com relatório detalhado

Para mais detalhes, consulte [Documentação da Pipeline](docs/pipeline.md).

## 🔐 Variáveis de Ambiente

| Nome | Descrição | Obrigatório |
|------|-----------|-------------|
| `MAX_PRICE` | Preço máximo para filtro de imóveis | Sim |
| `TARGET_REPO_URL` | URL do repositório alvo | Sim |
| `TARGET_REPO_PAT` | Token de acesso pessoal para o repositório | Sim |
| `GIT_USER_NAME` | Nome do usuário git para commits | Sim |
| `GIT_USER_EMAIL` | Email do usuário git para commits | Sim |
| `GEOCODE_HERE_API_KEY` | Chave da API HERE para geocodificação | Não |

## 📁 Estrutura do Projeto

```
├── config/                  # Configurações específicas de cada scraper
├── docs/                    # Documentação detalhada
├── logs/                    # Arquivos de log
├── scrapers/                # Código dos scrapers
│   ├── index.js             # Ponto de entrada
│   ├── olxScraper.js        # Scraper OLX
│   └── zapScraper.js        # Scraper ZAP
├── utils/                   # Utilitários compartilhados
│   ├── fileHelper.js        # Manipulação de arquivos
│   ├── dateHelper.js        # Funções de data
│   └── interactionsHelper.js # Simulação de interações
└── .github/workflows/       # Configuração da pipeline CI/CD
```

## 🔧 Resolução de Problemas

Encontrou problemas durante a execução? Consulte nosso [Guia de Resolução de Problemas](docs/troubleshooting.md).

Problemas comuns incluem:

- Timeouts durante o scraping
- Detecção de automação pelos sites
- Falhas na pipeline CI/CD

## 👥 Contribuição

Contribuições são bem-vindas! Veja [DEVELOPMENT.md](DEVELOPMENT.md) para detalhes sobre como configurar o ambiente de desenvolvimento e contribuir para este projeto.

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
