#!/bin/bash

# Diretório raiz do projeto
PROJECT_DIR="./"

# Criando a estrutura de diretórios
mkdir -p $PROJECT_DIR/{scrapers,data/results,utils,config,logs}

# Criando arquivos iniciais vazios
touch $PROJECT_DIR/scrapers/{olxScraper.js,index.js}
touch $PROJECT_DIR/data/results/olxResults.json
touch $PROJECT_DIR/utils/{puppeteerHelper.js,fileHelper.js}
touch $PROJECT_DIR/config/olxConfig.js
touch $PROJECT_DIR/logs/app.log
touch $PROJECT_DIR/.env
touch $PROJECT_DIR/.gitignore
touch $PROJECT_DIR/package.json
touch $PROJECT_DIR/README.md

# Mensagem de conclusão
echo "Estrutura de pastas e arquivos iniciais criada com sucesso em $PROJECT_DIR"
