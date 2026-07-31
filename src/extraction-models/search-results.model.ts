import { HtmlExtractionModel, css, extract } from "@xcrap/extractor"

const searchResultItemExtractionModel = new HtmlExtractionModel({
    title: {
        // No layout grid, a âncora engloba o h2 (a > h2 > span), então h2 a span falha.
        // h2 span funciona em ambos os layouts (grid e lista).
        query: css("h2 span"),
        extractor: extract("innerText"),
    },
    url: {
        // a.a-link-normal.a-text-normal é o link no layout real da Amazon; h2 a é o fallback padrao
        query: css("a.a-link-normal.a-text-normal, h2 a"),
        extractor: extract("href"),
    },
    thumbnail: {
        query: css("img.s-image"),
        extractor: extract("src"),
        default: null,
    },
    price: {
        // .a-offscreen dentro de .a-price contém o preço formatado (ex: "R$ 459,00")
        query: css(".a-price .a-offscreen"),
        extractor: extract("innerText"),
        default: null,
    },
    originalPrice: {
        // data-a-strike="true" ou .a-text-price .a-offscreen para preco riscado
        query: css(".a-price.a-text-price[data-a-strike='true'] .a-offscreen, .a-text-price .a-offscreen"),
        extractor: extract("innerText"),
        default: null,
    },
    rating: {
        // Wildcard cobre <i> e <span> com class a-icon-star
        query: css("[class*='a-icon-star'] .a-icon-alt"),
        extractor: extract("innerText"),
        default: null,
    },
    totalReviews: {
        // Link que aponta para #customerReviews contém a contagem de avaliações
        query: css("a[href*='#customerReviews']"),
        extractor: extract("innerText"),
        default: null,
    },
    asin: {
        query: css("[data-asin]"),
        extractor: extract("data-asin"),
        default: null,
    },
})

export const searchResultsExtractionModel = new HtmlExtractionModel({
    items: {
        query: css("[data-component-type='s-search-result']"),
        model: searchResultItemExtractionModel,
        multiple: true,
    },
})
