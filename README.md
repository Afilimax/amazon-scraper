<a href="https://afilimax.net"><img src="https://raw.githubusercontent.com/Afilimax/.github/main/assets/npm-banner.svg" alt="Afilimax — Encontre a oferta. Gere o link. Divulgue sozinho." width="100%" /></a>

[![npm version](https://img.shields.io/npm/v/%40afilimax%2Famazon-scraper?logo=npm)](https://www.npmjs.com/package/@afilimax/amazon-scraper)
[![npm downloads](https://img.shields.io/npm/dm/%40afilimax%2Famazon-scraper?logo=npm)](https://www.npmjs.com/package/@afilimax/amazon-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Afilimax/amazon-scraper/blob/HEAD/LICENSE)
[![Website](https://img.shields.io/badge/website-afilimax.net-7857FF)](https://afilimax.net)

# @afilimax/amazon-scraper

O `@afilimax/amazon-scraper` é uma biblioteca poderosa e resiliente para extração de dados de produtos da Amazon, focada especialmente no marketplace brasileiro (Amazon.com.br). Construída sobre o ecossistema `@xcrap`, ela oferece um sistema híbrido de requisições que maximiza a velocidade e a taxa de sucesso.

## ✨ Principais Características

- **🔄 Sistema Híbrido Resiliente**: Utiliza `GotScrapingClient` por padrão para máxima velocidade. Se um CAPTCHA for detectado, a biblioteca muda automaticamente para o `PuppeteerExtraClient` (browser real) para resolver o desafio e obter os dados.
- **🛡️ Evasão de Bots**: Integra `StealthPlugin` e `AmazonCaptchaPlugin` para minimizar bloqueios.
- **📊 Dados Estruturados**: Extrai títulos, preços, imagens, avaliações, especificações técnicas, disponibilidade e informações de frete.
- **🧩 Baseado em @xcrap**: Utiliza modelos de extração e transformação declarativos, facilitando a manutenção.
- **📦 Tipagem TypeScript**: Totalmente escrito em TypeScript com definições de tipos para todos os retornos.

## 🚀 Instalação

```bash
npm install @afilimax/amazon-scraper
```

*Nota: Certifique-se de ter as dependências do @afilimax/core devidamente configuradas se estiver usando em um ambiente monorepo.*

## 🛠️ Como Usar

### Exemplo Básico

```typescript
import { AmazonScraper } from '@afilimax/amazon-scraper';

async function run() {
    // Inicializa o scraper
    const scraper = new AmazonScraper({
        quiet: false // Define se deve exibir logs no console
    });

    try {
        const url = 'https://www.amazon.com.br/dp/B08P2B889P';
        
        // Obtém os dados do produto
        const product = await scraper.getProduct({ url });

        console.log('Dados do Produto:', JSON.stringify(product, null, 2));
    } catch (error) {
        console.error('Erro ao extrair produto:', error);
    } finally {
        // Importante fechar o browser (Puppeteer) se ele tiver sido aberto
        await scraper.close();
    }
}

run();
```

### Configurações Avançadas

Você pode passar opções customizadas para o Puppeteer ou para o cliente de requisições HTTP (Got):

```typescript
const scraper = new AmazonScraper({
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    },
    gotScraping: {
        // Opções do got-scraping
    },
    quiet: true
});
```

## 📋 API Reference

### `AmazonScraper`

#### `constructor(options?: AmazonScraperOptions)`
- `puppeteer`: Opções para o `PuppeteerExtraClient`.
- `gotScraping`: Opções para o `GotScrapingClient`.
- `quiet`: Se `true`, desativa os logs de depuração.

#### `getProduct(options: { url: string }): Promise<ScrapedProduct>`
Extrai todos os dados de um produto a partir de uma URL. Faz a limpeza automática de parâmetros de rastreamento da Amazon antes da extração.

#### `getProductPageParser(options: { url: string }): Promise<HtmlParser>`
Obtém apenas o parser HTML da página. Útil se você precisar fazer extrações manuais específicas usando `@xcrap/extractor`.

#### `close(): Promise<void>`
Fecha as instâncias abertas do browser. Sempre chame este método ao finalizar o uso.

## 🗃️ Estrutura de Dados Retornada

O método `getProduct` retorna um objeto seguindo o `scrapedProductSchema` do `@afilimax/core`, contendo:

- `title`: Título do produto.
- `price`: Preço atual (normalizado).
- `description`: Descrição detalhada.
- `images`: Array de URLs das imagens em alta resolução.
- `brand`: Marca do produto.
- `rating`: Objeto com média e total de avaliações.
- `specifications`: Lista de especificações técnicas.
- `features`: Características principais.
- `availability`: Status de estoque.
- `shipping`: Informações de frete estimadas.
- `scrapedAt`: Timestamp da extração.

## 🤝 Contribuição

Este projeto é focado no marketplace brasileiro. Se você deseja adicionar suporte para outros idiomas ou marketplaces regionais da Amazon, sinta-se à vontade para abrir uma issue ou enviar um Pull Request.

1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Execute os testes: `npm test`.

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
---

## Automatize sua operação de afiliados

> Use este pacote para automatizar sua operação de afiliados. Conheça a plataforma Afilimax e transforme ofertas em links e divulgação automática.

[Conheça a Afilimax](https://afilimax.net) · [Pacote no npm](https://www.npmjs.com/package/@afilimax/amazon-scraper) · [Repositório no GitHub](https://github.com/Afilimax/amazon-scraper)
