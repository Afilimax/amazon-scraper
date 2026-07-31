import { describe, it, expect, beforeEach, vi } from "vitest"
import { HtmlParser } from "@xcrap/extractor"
import { Marketplace } from "@afilimax/core"
import path from "node:path"
import fs from "node:fs"

import { AmazonScraper } from "../src/amazon"
import { searchResultsExtractionModel } from "../src/extraction-models/search-results.model"

const SEARCH_FIXTURE_PATH = path.join(__dirname, "fixtures", "search-results.html")

const MOCK_SEARCH_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div data-component-type="s-search-result" data-asin="B08N5WRWNW">
    <h2><a href="/dp/B08N5WRWNW/ref=sr_1_1"><span>Echo Dot 4ª Geração Smart Speaker com Alexa</span></a></h2>
    <img class="s-image" src="https://m.media-amazon.com/images/I/71S5omMBCFL._AC_UL320_.jpg" />
    <span class="a-price"><span class="a-offscreen">R$&nbsp;349,00</span></span>
    <span class="a-price a-text-price" data-a-strike="true"><span class="a-offscreen">R$&nbsp;499,00</span></span>
    <span class="a-icon-star-small"><span class="a-icon-alt">4,7 de 5 estrelas</span></span>
    <span class="a-size-base s-underline-text">12.450</span>
    <span class="a-size-base-plus a-color-base">Amazon</span>
  </div>
  <div data-component-type="s-search-result" data-asin="B09B8YVXPR">
    <h2><a href="/dp/B09B8YVXPR/ref=sr_1_2"><span>Echo Pop Smart Speaker Compacto com Alexa</span></a></h2>
    <img class="s-image" src="https://m.media-amazon.com/images/I/51HVJBqsMpL._AC_UL320_.jpg" />
    <span class="a-price"><span class="a-offscreen">R$&nbsp;249,00</span></span>
    <span class="a-icon-star-small"><span class="a-icon-alt">4,5 de 5 estrelas</span></span>
    <span class="a-size-base s-underline-text">5.230</span>
  </div>
  <div data-component-type="s-search-result" data-asin="B07FZ8S74R">
    <h2><a href="https://www.amazon.com.br/dp/B07FZ8S74R"><span>Produto com URL absoluta</span></a></h2>
    <img class="s-image" src="https://example.com/image.jpg" />
    <span class="a-price"><span class="a-offscreen">R$&nbsp;99,90</span></span>
  </div>
</body>
</html>
`

describe("AmazonScraper", () => {
    describe("searchProducts (extração de modelo)", () => {
        it("deve extrair itens da página de busca corretamente", async () => {
            const parser = new HtmlParser(MOCK_SEARCH_HTML)
            const extracted = await parser.extractModel({ model: searchResultsExtractionModel }) as any

            expect(extracted.items).toBeDefined()
            expect(Array.isArray(extracted.items)).toBe(true)
            expect(extracted.items.length).toBe(3)
        })

        it("deve extrair o título dos itens", async () => {
            const parser = new HtmlParser(MOCK_SEARCH_HTML)
            const extracted = await parser.extractModel({ model: searchResultsExtractionModel }) as any

            expect(extracted.items[0].title).toBe("Echo Dot 4ª Geração Smart Speaker com Alexa")
            expect(extracted.items[1].title).toBe("Echo Pop Smart Speaker Compacto com Alexa")
        })

        it("deve extrair a URL dos itens", async () => {
            const parser = new HtmlParser(MOCK_SEARCH_HTML)
            const extracted = await parser.extractModel({ model: searchResultsExtractionModel }) as any

            expect(extracted.items[0].url).toContain("B08N5WRWNW")
            expect(extracted.items[1].url).toContain("B09B8YVXPR")
        })

        it("deve extrair o thumbnail dos itens", async () => {
            const parser = new HtmlParser(MOCK_SEARCH_HTML)
            const extracted = await parser.extractModel({ model: searchResultsExtractionModel }) as any

            expect(extracted.items[0].thumbnail).toBe("https://m.media-amazon.com/images/I/71S5omMBCFL._AC_UL320_.jpg")
        })

        it("deve extrair o ASIN dos itens", async () => {
            const parser = new HtmlParser(MOCK_SEARCH_HTML)
            const extracted = await parser.extractModel({ model: searchResultsExtractionModel }) as any

            expect(extracted.items[0].asin).toBe("B08N5WRWNW")
            expect(extracted.items[1].asin).toBe("B09B8YVXPR")
        })
    })

    describe("searchProducts (mapeamento para ScrapedProductPreview)", () => {
        let scraper: AmazonScraper

        beforeEach(() => {
            scraper = new AmazonScraper({ quiet: true })

            // Mock do gotScrapingClient para retornar o HTML de teste
            const mockParser = new HtmlParser(MOCK_SEARCH_HTML)
            const mockResponse = {
                asHtmlParser: () => mockParser,
            }

            ;(scraper as any).gotScrapingClient = {
                fetch: vi.fn().mockResolvedValue(mockResponse),
            }

            // hasCaptcha sempre retorna false (sem captcha)
            ;(scraper as any).hasCaptcha = vi.fn().mockResolvedValue(false)
        })

        it("deve retornar um array de ScrapedProductPreview", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(Array.isArray(results)).toBe(true)
            expect(results.length).toBeGreaterThan(0)
        })

        it("deve preencher o campo marketplace como Amazon", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(results[0].marketplace).toBe(Marketplace.Amazon)
        })

        it("deve preencher title, url e externalId corretamente", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })
            const first = results[0]

            expect(first.title).toBe("Echo Dot 4ª Geração Smart Speaker com Alexa")
            expect(first.url).toContain("B08N5WRWNW")
            expect(first.externalId).toBe("B08N5WRWNW")
        })

        it("deve preencher o thumbnail", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(results[0].thumbnail).toBe(
                "https://m.media-amazon.com/images/I/71S5omMBCFL._AC_UL320_.jpg"
            )
        })

        it("deve extrair e converter o preço corretamente", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(results[0].price.value).toBe(349)
            expect(results[0].price.currency).toBe("BRL")
        })

        it("deve extrair o preço original quando presente", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(results[0].price.originalValue).toBe(499)
        })

        it("deve retornar originalValue como null quando ausente", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(results[1].price.originalValue).toBeNull()
        })

        it("deve extrair e normalizar o rating", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })
            const rating = results[0].rating

            expect(rating).not.toBeNull()
            expect(rating!.average).toBe(4.7)
        })

        it("deve preencher o scrapedAt como string ISO", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(typeof results[0].scrapedAt).toBe("string")
            expect(() => new Date(results[0].scrapedAt)).not.toThrow()
        })

        it("deve prefixar URLs relativas com o domínio da Amazon BR", async () => {
            const results = await scraper.searchProducts({ query: "echo dot" })

            // Itens 0 e 1 têm URLs relativas (/dp/...)
            expect(results[0].url).toMatch(/^https:\/\/www\.amazon\.com\.br/)
            // Item 2 já tem URL absoluta
            expect(results[2].url).toMatch(/^https:\/\/www\.amazon\.com\.br/)
        })

        it("deve usar Puppeteer como fallback quando captcha for detectado", async () => {
            const mockParser = new HtmlParser(MOCK_SEARCH_HTML)
            const mockResponse = { asHtmlParser: () => mockParser }
            const puppeteerFetchMock = vi.fn().mockResolvedValue(mockResponse)

            ;(scraper as any).hasCaptcha = vi.fn().mockResolvedValue(true)
            ;(scraper as any).puppeteerClient = { fetch: puppeteerFetchMock, close: vi.fn() }

            const results = await scraper.searchProducts({ query: "echo dot" })

            expect(puppeteerFetchMock).toHaveBeenCalled()
            expect(results.length).toBeGreaterThan(0)
        })

        it("deve passar o número de página correto na URL de busca", async () => {
            const gotFetchMock = vi.fn().mockResolvedValue({
                asHtmlParser: () => new HtmlParser(MOCK_SEARCH_HTML),
            })
            ;(scraper as any).gotScrapingClient = { fetch: gotFetchMock }

            await scraper.searchProducts({ query: "echo dot", page: 3 })

            const calledUrl: string = gotFetchMock.mock.calls[0][0].url
            expect(calledUrl).toContain("page=3")
            expect(calledUrl).toContain("k=echo%20dot")
        })
    })

    describe("searchProducts (fixtures reais)", () => {
        it("deve processar fixture HTML real se existir", async () => {
            if (!fs.existsSync(SEARCH_FIXTURE_PATH)) {
                console.warn(`⚠️ Fixture não encontrada em ${SEARCH_FIXTURE_PATH}, pulando teste`)
                return
            }

            const html = await fs.promises.readFile(SEARCH_FIXTURE_PATH, "utf-8")
            const parser = new HtmlParser(html)
            const extracted = await parser.extractModel({ model: searchResultsExtractionModel }) as any

            expect(Array.isArray(extracted.items)).toBe(true)
            expect(extracted.items.length).toBeGreaterThan(0)

            for (const item of extracted.items) {
                expect(item.title).toBeDefined()
                expect(item.url).toBeDefined()
            }
        })
    })
})
