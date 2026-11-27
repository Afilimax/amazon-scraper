<a href="https://afilimax.net"><img src="https://raw.githubusercontent.com/Afilimax/.github/main/assets/npm-banner.svg" alt="Afilimax — Encontre a oferta. Gere o link. Divulgue sozinho." width="100%" /></a>

[![npm version](https://img.shields.io/npm/v/%40afilimax%2Famazon-scraper?logo=npm)](https://www.npmjs.com/package/@afilimax/amazon-scraper)
[![npm downloads](https://img.shields.io/npm/dm/%40afilimax%2Famazon-scraper?logo=npm)](https://www.npmjs.com/package/@afilimax/amazon-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Afilimax/amazon-scraper/blob/HEAD/LICENSE)
[![Website](https://img.shields.io/badge/website-afilimax.net-7857FF)](https://afilimax.net)

# @afilimax/amazon-scraper

Biblioteca TypeScript para pesquisar e extrair produtos da Amazon Brasil. Construída sobre o ecossistema Xcrap, combina requisições HTTP com navegador automatizado e converte os dados extraídos para os contratos do `@afilimax/core`.

## Recursos

- Extração de título, descrição, marca, preços, imagens e avaliações.
- Leitura de disponibilidade, frete, características e especificações.
- Pesquisa paginada de produtos na Amazon Brasil.
- Requisições iniciais com `GotScrapingClient`.
- Fallback para `PuppeteerExtraClient` ao detectar CAPTCHA ou resposta incompleta.
- Plugins de stealth e suporte a CAPTCHA da Amazon.
- Limpeza de parâmetros e segmentos de rastreamento das URLs.
- Validação do produto final com `scrapedProductSchema`.

## Instalação

```bash
npm install @afilimax/amazon-scraper @afilimax/core
```

O `@afilimax/core` é uma dependência de par obrigatória, na versão `^0.5.0`.

## Como usar

### Extrair um produto

```typescript
import { AmazonScraper } from "@afilimax/amazon-scraper"

async function main() {
    const scraper = new AmazonScraper({ quiet: false })

    try {
        const product = await scraper.getProduct({
            url: "https://www.amazon.com.br/dp/B08P2B889P",
        })

        console.log("Product title:", product.title)
        console.log(JSON.stringify(product, null, 2))
    } catch (error) {
        console.error("Product extraction failed:", error)
    } finally {
        await scraper.close()
    }
}

main()
```

### Pesquisar produtos

```typescript
const products = await scraper.searchProducts({
    query: "wireless headphones",
    page: 1,
})

console.log("Products found:", products.length)
```

Sempre chame `close()` ao finalizar para liberar os recursos do cliente Puppeteer.

## Configuração

O construtor aceita `AmazonScraperOptions`:

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `puppeteer` | `PuppeteerExtraClientOptions` | `{}` | Configuração do cliente de navegador e de seus plugins adicionais. |
| `gotScraping` | `GotScrapingClientOptions` | `{}` | Configuração do cliente HTTP. |
| `quiet` | `boolean` | `false` | Controla os logs de diagnóstico criados pelo scraper. |

Os plugins de stealth e CAPTCHA são incluídos antes dos plugins personalizados. O cliente Puppeteer usa `headless: "new"` por padrão, salvo quando essa opção é sobrescrita.

## Referência da API

### Métodos

#### `getProduct(options): Promise<ScrapedProduct>`

Obtém a página, extrai o modelo de produto, transforma os valores e valida o resultado.

| Opção | Tipo | Descrição |
| :--- | :--- | :--- |
| `url` | `string` | URL do produto na Amazon. |

#### `searchProducts(options): Promise<ScrapedProductPreview[]>`

Pesquisa no catálogo brasileiro e retorna itens que possuem título e URL.

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `query` | `string` | Obrigatório | Termo de pesquisa. |
| `page` | `number` | `1` | Página da pesquisa. |

#### `getProductPageParser(options): Promise<HtmlParser>`

Retorna o parser HTML da página para extrações personalizadas com `@xcrap/extractor`. A URL é limpa antes da requisição.

#### `AmazonScraper.extractProduct(options): Promise<ScrapedProduct>`

Método estático que transforma um `HtmlParser` já carregado em um produto validado. Aceita `url`, `parser` e um `logger` opcional do Winston.

#### `close(): Promise<void>`

Fecha os recursos mantidos pelo `PuppeteerExtraClient`.

### Estrutura do retorno

`getProduct` retorna `ScrapedProduct`:

```typescript
const product = {
    marketplace: "amazon",
    externalId: "B08P2B889P",
    title: "Wireless Headphones",
    description: "Wireless over-ear headphones",
    brand: "Example Brand",
    price: {
        value: 299.9,
        originalValue: 399.9,
        currency: "BRL",
        pixPrice: null,
        installment: null,
    },
    shipping: {
        price: 0,
        currency: "BRL",
        freeShipping: true,
        full: null,
        prime: true,
        estimatedTime: null,
    },
    rating: {
        average: 4.7,
        totalReviews: 1200,
    },
    availability: {
        inStock: true,
        quantity: null,
    },
    images: ["https://example.com/product.jpg"],
    thumbnails: ["https://example.com/product.jpg"],
    categories: null,
    features: { Color: "Black" },
    specifications: { Connectivity: "Bluetooth" },
    coupons: null,
    scrapedAt: "2026-10-17T21:34:16.832Z",
}
```

A busca retorna `ScrapedProductPreview[]`, com `marketplace`, `externalId`, `title`, `url`, `thumbnail`, `price`, `rating`, `brand` e `scrapedAt`.

## Desenvolvimento

Instale as dependências com `npm install`. Os scripts disponíveis são:

| Comando | Finalidade |
| :--- | :--- |
| `npm run dev` | Executa `src/index.ts` com `ts-node`. |
| `npm run build` | Compila o TypeScript para `dist/`. |
| `npm test` | Executa os testes com Vitest. |
| `npm run test:watch` | Executa os testes em modo de observação. |
| `npm run test:cov` | Executa os testes com cobertura. |
| `npm run lint` | Executa o ESLint com correção automática. |
| `npm run format` | Formata os arquivos de `src/` com Prettier. |

## Licença

Distribuído sob a licença [MIT](./LICENSE).

---

## Automatize sua operação de afiliados

> Use este pacote para automatizar sua operação de afiliados. Conheça a plataforma Afilimax e transforme ofertas em links e divulgação automática.

[Conheça a Afilimax](https://afilimax.net) · [Pacote no npm](https://www.npmjs.com/package/@afilimax/amazon-scraper) · [Repositório no GitHub](https://github.com/Afilimax/amazon-scraper)
