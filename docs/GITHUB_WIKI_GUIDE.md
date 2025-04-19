# Configurando uma Wiki no GitHub

Este documento explica como configurar e usar a Wiki do GitHub como uma opção adicional para documentar o projeto de forma mais colaborativa.

## Por que usar a Wiki do GitHub

A Wiki do GitHub oferece algumas vantagens em comparação com a documentação no repositório principal:

1. **Interface amigável**: Permite edição e navegação direta pelo navegador
2. **Colaboração facilitada**: Qualquer colaborador pode editar e contribuir
3. **Organização hierárquica**: Facilita a criação de conteúdo estruturado
4. **Histórico completo**: Mantém versões anteriores de cada página
5. **Separação de concerns**: Mantém a documentação separada do código

## Como Configurar a Wiki

1. **Habilitar a Wiki no repositório**:
   - Acesse a página do repositório no GitHub
   - Clique na aba "Settings"
   - Role até a seção "Features"
   - Marque a opção "Wikis"
   - Clique em "Save changes"

2. **Acessar a Wiki**:
   - Volte para a página principal do repositório
   - Clique na aba "Wiki"
   - Você será direcionado para a página inicial da Wiki

3. **Criar a primeira página**:
   - Clique em "Create the first page"
   - Dê um título para a página inicial (geralmente "Home")
   - Escreva o conteúdo usando Markdown
   - Adicione um comentário de commit (ex: "Criação da página inicial")
   - Clique em "Save Page"

## Estrutura Sugerida para a Wiki

Para este projeto de scraping, recomendamos a seguinte estrutura:

```
Home
├── Visão Geral
├── Guia de Início Rápido
├── Arquitetura
│   ├── Diagrama do Sistema
│   ├── Fluxo de Dados
│   └── Componentes
├── Scrapers
│   ├── OLX Scraper
│   └── ZAP Scraper
├── Pipeline CI/CD
│   ├── Workflow
│   ├── Jobs e Steps
│   └── Troubleshooting
├── Guia de Contribuição
│   ├── Ambiente de Desenvolvimento
│   ├── Padrões de Código
│   └── Fluxo de Contribuição
└── FAQ
```

## Como Organizar as Páginas

1. **Criando páginas vinculadas**:
   - Na página inicial, adicione links para as subpáginas:

     ```markdown
     - [Visão Geral](Visão-Geral)
     - [Arquitetura](Arquitetura)
     ```

   - Clique nesses links para criar cada página
   - Preencha o conteúdo e salve

2. **Formatação e recursos**:
   - Use Markdown para formatar o texto
   - Inclua imagens com `![Descrição](URL da imagem)`
   - Crie tabelas, listas e blocos de código conforme necessário

3. **Adicionando imagens**:
   - As imagens não podem ser enviadas diretamente para a Wiki
   - Recomendamos criar uma pasta `wiki-assets` no repositório principal
   - Faça upload das imagens nessa pasta
   - Referencie-as na Wiki com o URL absoluto:

     ```markdown
     ![Diagrama](/ApenasGabs/scraping-grupo-olx/raw/main/wiki-assets/diagram.png)
     ```

## Sincronização com a Documentação do Repositório

Para manter a Wiki e a documentação do repositório alinhadas, considere:

1. **Automatização**:
   - Crie scripts para sincronizar o conteúdo da pasta `/docs` com a Wiki
   - Use a API do GitHub para atualizar a Wiki programaticamente

2. **Escolha a fonte primária**:
   - Decida se a Wiki ou a pasta `/docs` será a fonte principal
   - Se for a pasta `/docs`, sincronize para a Wiki
   - Se for a Wiki, sincronize para a pasta `/docs`

3. **Referências cruzadas**:
   - No README.md do repositório, inclua links para a Wiki
   - Na Wiki, inclua links para arquivos específicos no repositório

## Exemplo de Script de Sincronização

```javascript
const fs = require('fs');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function syncDocsToWiki() {
  const owner = 'ApenasGabs';
  const repo = 'scraping-grupo-olx';
  const docsDir = './docs';
  
  const files = fs.readdirSync(docsDir);
  
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(`${docsDir}/${file}`, 'utf8');
      const title = file.replace('.md', '');
      
      console.log(`Sincronizando ${file} para a Wiki...`);
      
      // Código para atualizar a Wiki usando a API do GitHub
      // Nota: A API oficial do GitHub não suporta diretamente a edição de Wikis
      // Seria necessário usar uma biblioteca de terceiros ou comandos git
    }
  }
}

syncDocsToWiki().catch(console.error);
```

## Boas Práticas

1. **Mantenha a documentação atualizada**:
   - Atualize a Wiki sempre que houver mudanças significativas
   - Faça revisões periódicas para garantir que o conteúdo está correto

2. **Use um estilo consistente**:
   - Mantenha um tom e estilo de escrita uniforme
   - Use templates para páginas semelhantes

3. **Evite duplicação**:
   - Prefira links entre páginas a copiar conteúdo
   - Use includes ou templates quando disponíveis

4. **Inclua exemplos práticos**:
   - Adicione blocos de código com exemplos reais
   - Inclua capturas de tela para ilustrar processos

5. **Organize por audiência**:
   - Separe conteúdo para usuários finais e desenvolvedores
   - Crie seções introdutórias para iniciantes

## Considerações Finais

A Wiki do GitHub é uma ferramenta poderosa para documentação colaborativa, mas requer compromisso da equipe para se manter atualizada e útil. Avalie regularmente se ela está atendendo às necessidades do projeto e ajuste conforme necessário.

Para este projeto específico, recomendamos começar com a documentação no repositório (pasta `/docs`) e, à medida que o projeto cresce, considerar migrar para a Wiki para facilitar a colaboração de um número maior de contribuidores.
