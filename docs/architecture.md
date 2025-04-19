# Arquitetura do Projeto de Web Scraping

## Visão Geral

Este projeto é um sistema automatizado de web scraping para coleta de dados imobiliários do ZAP e OLX. A arquitetura é composta por scrapers independentes que são executados por uma pipeline CI/CD no GitHub Actions.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  OLX        │     │  ZAP         │     │             │
│  Scraper    ├────►│  Scraper     ├────►│  Pipeline   │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
        ┌─────────────────────────────────────┐ │
        │                                     │ │
        ▼                                     ▼ ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Merge      │     │  Relatório   │     │  Pull       │
│  Resultados ├────►│  Sumário     ├────►│  Request    │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Componentes Principais

### 1. Scrapers

- **OLX Scraper**: Coleta dados da plataforma OLX
- **ZAP Scraper**: Coleta dados da plataforma ZAP Imóveis
- **Puppet Helper**: Utilitário compartilhado para manipulação do navegador

### 2. Processamento de Dados

- **File Helper**: Utilitários para manipulação de arquivos JSON
- **ID Generator**: Geração de identificadores únicos para os imóveis
- **Merge Results**: Combinação de novos dados com os existentes

### 3. Pipeline CI/CD

- **GitHub Actions**: Workflow automatizado para execução dos scrapers
- **Artefatos**: Armazenamento temporário dos resultados de cada scraper
- **Pull Requests**: Mecanismo de atualização do repositório alvo

## Fluxo de Dados

1. Os scrapers coletam dados das respectivas plataformas
2. Os dados são validados e armazenados em arquivos JSON
3. Em caso de falhas, são registrados logs e capturas de tela
4. A pipeline combina os novos dados com os dados existentes
5. Um relatório é gerado com estatísticas de atualização
6. Um Pull Request é criado para o repositório alvo

## Diagrama de Dependências

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ puppeteer      │     │ fs             │     │ path           │
└───────┬────────┘     └────────┬───────┘     └────────────────┘
        │                       │                      ▲
        ▼                       ▼                      │
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ Browser        │     │ File           │     │ Config         │
│ Interactions   │     │ Operations     │     │ Management     │
└───────┬────────┘     └────────┬───────┘     └────────┬───────┘
        │                       │                      │
        └───────────────────────┼──────────────────────┘
                                │
                                ▼
                        ┌────────────────┐
                        │ Scrapers       │
                        └────────────────┘
```

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução
- **Puppeteer**: Automação de navegador headless
- **GitHub Actions**: Pipeline CI/CD
- **JSON**: Formato de armazenamento de dados
