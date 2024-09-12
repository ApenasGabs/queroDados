# Scraping grupo olx
# 🚧 EM CONSTRUCAO🚧  

Este repositório, **scraping-grupo-olx**, foi desenvolvido para realizar a coleta de dados de anúncios de imóveis nos sites do grupo OLX, especificamente OLX e ZAP Imóveis, na região de Campinas, SP. O objetivo principal é gerar dados para análises, e o projeto é estritamente para fins não comerciais.

## Descrição

O projeto utiliza a biblioteca [Puppeteer](https://pptr.dev/) para automatizar a navegação e extração de informações dos sites OLX e ZAP Imóveis. Os dados coletados incluem o endereço, preço e número de quartos das casas listadas para venda. A lógica de paginação está implementada para garantir que os dados sejam extraídos de todas as páginas de resultados disponíveis.

## Funcionalidades

- **Coleta de Dados**: Extração de informações relevantes de cada anúncio de imóvel.
- **Paginação Automática**: Navegação automática por todas as páginas de resultados disponíveis.
- **Configuração de Filtros**: Possibilidade de configurar filtros como tipo de propriedade e preço máximo.

## Estrutura do Projeto

- `index.js`: Script principal que inicia o navegador, realiza a coleta de dados e gerencia a paginação.
- `package.json`: Gerenciamento de dependências do projeto.

## Dependências

- [Puppeteer](https://pptr.dev/): Biblioteca para controle automatizado do navegador.

## Como Executar

1. Clone este repositório:
    ```sh
    git clone https://github.com/ApenasGabs/scraping-grupo-olx.git
    ```
2. Navegue até o diretório do projeto:
    ```sh
    cd scraping-grupo-olx
    ```
3. Instale as dependências:
    ```sh
    npm install
    ```
4. Execute o script principal:
    ```sh
    npm start
    ```

## Observações

- Este projeto é destinado apenas para fins não comerciais.
- A coleta de dados respeita as políticas de uso dos sites OLX e ZAP Imóveis.

## Licença

Este projeto não possui uma licença específica e é fornecido "como está" para fins de aprendizado e análise de dados.
