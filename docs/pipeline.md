# Pipeline de Automação (GitHub Actions)

## Visão Geral

A pipeline deste projeto é implementada usando GitHub Actions para automatizar o processo de scraping, processamento e atualização dos dados imobiliários. O workflow é executado diariamente ou quando acionado manualmente.

## Estrutura da Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  olx-scraper    │     │  zap-scraper    │     │  download-and-      │
│  job            │     │  job            │     │  update-repo job    │
└────────┬────────┘     └────────┬────────┘     └──────────┬──────────┘
         │                       │                         │
         └───────────────────────┼─────────────────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  Pull Request para  │
                      │  repositório alvo   │
                      └─────────────────────┘
```

## Gatilhos (Triggers)

O workflow é executado nos seguintes eventos:

```yaml
on:
  push:
    branches:
      - main
  schedule:
    - cron: "40 4 * * *"  # Execução diária às 04:40 UTC
  workflow_dispatch:      # Acionamento manual
```

## Jobs Principais

### 1. olx-scraper

Este job é responsável por executar o scraper da OLX:

- **Ações principais**:
  - Checkout do repositório
  - Configuração do Node.js
  - Instalação de dependências
  - Execução do scraper com reinicialização automática em caso de falha
  - Validação dos resultados
  - Upload dos resultados como artefato

### 2. zap-scraper

Este job executa o scraper do ZAP Imóveis:

- **Ações principais**:
  - Checkout do repositório
  - Configuração do Node.js
  - Instalação de dependências
  - Execução do scraper com reinicialização automática em caso de falha
  - Validação dos resultados
  - Upload dos resultados como artefato

### 3. download-and-update-repo

Este job é responsável por combinar os resultados e enviar as atualizações:

- **Ações principais**:
  - Checkout do repositório
  - Clone do repositório alvo
  - Download dos artefatos dos jobs anteriores
  - Verificação e validação dos dados baixados
  - Mesclagem dos novos dados com os existentes
  - Atualização de coordenadas geográficas
  - Geração de relatório de resumo
  - Criação ou atualização do Pull Request

## Estratégia de Recuperação

A pipeline incorpora várias estratégias para lidar com falhas:

1. **Tentativas automáticas**: Cada scraper é executado até 3 vezes em caso de falha
2. **Logs de erro**: Erros são registrados em arquivos JSON para análise posterior
3. **Capturas de tela**: Screenshots são salvos em caso de falha para facilitar a depuração
4. **Preservação de dados**: Em caso de falha completa, mantemos os dados anteriores para não perder informação

## Variáveis de Ambiente

As seguintes variáveis de ambiente são utilizadas:

- `RESULTS_DIR`: Diretório para armazenar os resultados
- `QUEROCASA_DIR`: Diretório do repositório alvo
- `MAX_RETRIES`: Número máximo de tentativas para cada scraper (default: 3)
- `RETRY_DELAY`: Tempo de espera entre tentativas (default: 10 segundos)

## Secrets

Os seguintes secrets são necessários:

- `MAX_PRICE`: Preço máximo para filtro de imóveis
- `TARGET_REPO_URL`: URL do repositório alvo
- `TARGET_REPO_PAT`: Token de acesso pessoal para o repositório alvo
- `GIT_USER_NAME`: Nome do usuário git para commits
- `GIT_USER_EMAIL`: Email do usuário git para commits
- `GEOCODE_HERE_API_KEY`: Chave API para serviço de geocodificação (opcional)

## Relatório de Pull Request

A pipeline gera automaticamente um relatório de resumo para o Pull Request, contendo:

- Estatísticas de adições, atualizações e remoções por plataforma
- Total de imóveis após o merge
- Informações sobre atualizações de coordenadas geográficas
- Detalhes de erros ocorridos durante o scraping
- Capturas de tela de erros para facilitar a depuração
