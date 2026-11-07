import { describe, it, expect, vi, beforeEach } from "vitest"
import { HtmlParser } from "@xcrap/extractor"

import path from "node:path"
import fs from "node:fs"

import { AmazonScraper } from "../src/amazon"

const FIXTURES_DIR = path.join(__dirname, "fixtures")
const PRODUCT_URL = "https://www.amazon.com.br/Produto/dp/B075357582/ref=sr_1_1?crid=abc&keywords=x"
const CLEAN_URL = "https://www.amazon.com.br/Produto/dp/B075357582"

const LONG_OK_HTML = `<html><body>${"a".repeat(31000)}</body></html>`

// Fixture sem bloco de entrega (#deliveryBlockMessage)
const NO_DELIVERY_FIXTURE = 5

function readFixture(index = 0) {
    const files = fs.readdirSync(FIXTURES_DIR)
    return fs.readFileSync(path.join(FIXTURES_DIR, files[index]), "utf-8")
}

function makeResponse(body: string) {
    return { body, asHtmlParser: () => new HtmlParser(body) }
}

function makeScraper() {
    const scraper = new AmazonScraper({ quiet: true })
    const got = { fetch: vi.fn() }
    const puppeteer = { fetch: vi.fn(), close: vi.fn() }
    ;(scraper as any).gotScrapingClient = got
    ;(scraper as any).puppeteerClient = puppeteer
    return { scraper, got, puppeteer }
}

describe("AmazonScraper constructor", () => {
    it("works with default options", async () => {
        const scraper = new AmazonScraper()
        expect(scraper).toBeInstanceOf(AmazonScraper)
    })

    it("accepts custom puppeteer plugins and options", () => {
        const scraper = new AmazonScraper({ puppeteer: { plugins: [] }, gotScraping: {}, quiet: true })
        expect(scraper).toBeInstanceOf(AmazonScraper)
    })
})

describe("AmazonScraper.hasCaptchaHtml", () => {
    const scraper = new AmazonScraper({ quiet: true })
    const check = (html: string) => (scraper as any).hasCaptchaHtml(html) as boolean

    it("treats short pages as captcha", () => {
        expect(check("<html></html>")).toBe(true)
    })

    it.each(["validateCaptcha", "Amazon CAPTCHA", "/errors/validateCaptcha", "api-services-support@amazon.com"])(
        "detects marker %s",
        (marker) => {
            expect(check(`${LONG_OK_HTML}${marker}`)).toBe(true)
        },
    )

    it("accepts long pages without markers", () => {
        expect(check(LONG_OK_HTML)).toBe(false)
    })
})

describe("AmazonScraper.getProductPageParser", () => {
    it("uses got-scraping with a cleaned url when there is no captcha", async () => {
        const { scraper, got, puppeteer } = makeScraper()
        got.fetch.mockResolvedValue(makeResponse(LONG_OK_HTML))

        const parser = await scraper.getProductPageParser({ url: PRODUCT_URL })

        expect(parser).toBeInstanceOf(HtmlParser)
        expect(got.fetch).toHaveBeenCalledWith({ url: CLEAN_URL })
        expect(puppeteer.fetch).not.toHaveBeenCalled()
    })

    it("falls back to puppeteer when a captcha is detected", async () => {
        const { scraper, got, puppeteer } = makeScraper()
        got.fetch.mockResolvedValue(makeResponse("<html>validateCaptcha</html>"))
        puppeteer.fetch.mockResolvedValue(makeResponse(LONG_OK_HTML))

        await scraper.getProductPageParser({ url: PRODUCT_URL })

        expect(puppeteer.fetch).toHaveBeenCalledWith({ url: CLEAN_URL })
    })
})

describe("AmazonScraper.getProduct", () => {
    it("fetches and extracts a product", async () => {
        const { scraper, got } = makeScraper()
        got.fetch.mockResolvedValue(makeResponse(readFixture()))

        const product = await scraper.getProduct({ url: PRODUCT_URL })

        expect(product.externalId).toBe("B075357582")
        expect(product.title).toBeTruthy()
    })
})

describe("AmazonScraper.extractProduct", () => {
    it("works without a logger", async () => {
        const product = await AmazonScraper.extractProduct({
            parser: new HtmlParser(readFixture()),
            url: PRODUCT_URL,
        })

        expect(product.marketplace).toBe("amazon")
    })

    it("extracts shipping info when the delivery block is present", async () => {
        const html = readFixture(NO_DELIVERY_FIXTURE).replace(
            "</body>",
            `<div id="deliveryBlockMessage"><span data-csa-c-delivery-price="GRÁTIS"></span><span class="a-text-bold">amanhã</span></div></body>`,
        )

        const product = await AmazonScraper.extractProduct({ parser: new HtmlParser(html), url: PRODUCT_URL })

        expect(product.shipping).toMatchObject({ price: null, estimatedTime: "amanhã" })
    })

    it("converts a numeric delivery price", async () => {
        const html = readFixture(NO_DELIVERY_FIXTURE).replace(
            "</body>",
            `<div id="deliveryBlockMessage"><span data-csa-c-delivery-price="12"></span><span class="a-text-bold">amanhã</span></div></body>`,
        )

        const product = await AmazonScraper.extractProduct({ parser: new HtmlParser(html), url: PRODUCT_URL })

        expect(product.shipping?.price).toBe(12000)
    })

    it("throws on an unknown delivery price", async () => {
        const html = readFixture(NO_DELIVERY_FIXTURE).replace(
            "</body>",
            `<div id="deliveryBlockMessage"><span data-csa-c-delivery-price="R$ 12"></span><span class="a-text-bold">x</span></div></body>`,
        )

        await expect(AmazonScraper.extractProduct({ parser: new HtmlParser(html), url: PRODUCT_URL })).rejects.toThrow(
            "Invalid price R$ 12",
        )
    })

    it("maps feature and specification tables into records", async () => {
        const html = readFixture(NO_DELIVERY_FIXTURE).replace(
            "</body>",
            `<div id="prodDetails"><table><tr><th class="prodDetSectionEntry"> Marca </th><td class="prodDetAttrValue">X&nbspY</td></tr></table></div>
<div id="productOverview_feature_div"><table class="a-normal a-spacing-micro"><tr><td><span>Cor</span></td><td><span>Azul</span></td></tr></table></div></body>`,
        )

        const product = await AmazonScraper.extractProduct({ parser: new HtmlParser(html), url: PRODUCT_URL })

        expect(product.features).toEqual({ Marca: "X Y" })
        expect(product.specifications).toEqual({ Cor: "Azul" })
    })

    it("fails schema validation when there are no images", async () => {
        const html = readFixture().replace(/<img[^>]*>/g, "")

        await expect(AmazonScraper.extractProduct({ parser: new HtmlParser(html), url: PRODUCT_URL })).rejects.toThrow()
    })
})

describe("AmazonScraper.searchProducts mapping", () => {
    let ctx: ReturnType<typeof makeScraper>

    beforeEach(() => {
        ctx = makeScraper()
    })

    function mockItems(items: unknown) {
        const parser = { extractModel: vi.fn().mockResolvedValue(items === undefined ? {} : { items }) }
        ctx.got.fetch.mockResolvedValue({ body: LONG_OK_HTML, asHtmlParser: () => parser })
        return parser
    }

    it("returns an empty list when the model has no items", async () => {
        mockItems(undefined)

        await expect(ctx.scraper.searchProducts({ query: "x" })).resolves.toEqual([])
    })

    it("filters out items without title or url", async () => {
        mockItems([
            { title: null, url: "/dp/B000000001" },
            { title: "Sem url", url: null },
        ])

        await expect(ctx.scraper.searchProducts({ query: "x" })).resolves.toEqual([])
    })

    it("maps a complete item", async () => {
        mockItems([
            {
                title: "  Produto  ",
                url: "/dp/B000000001/ref=x",
                asin: "B000000001",
                thumbnail: "https://img/1.jpg",
                price: "R$ 1.299,90",
                originalPrice: "R$ 1.999,90",
                rating: "4,5 de 5 estrelas",
                totalReviews: "1.234",
                brand: "Marca",
            },
        ])

        const [item] = await ctx.scraper.searchProducts({ query: "x" })

        expect(item).toMatchObject({
            title: "Produto",
            url: "https://www.amazon.com.br/dp/B000000001/ref=x",
            externalId: "B000000001",
            thumbnail: "https://img/1.jpg",
            brand: "Marca",
            price: { value: 1299.9, originalValue: 1999.9, currency: "BRL" },
            rating: { average: 4.5, totalReviews: 1234 },
        })
    })

    it("falls back to nulls and extracts the asin from the url", async () => {
        mockItems([{ title: "Produto", url: "https://www.amazon.com.br/dp/B000000002" }])

        const [item] = await ctx.scraper.searchProducts({ query: "x" })

        expect(item).toMatchObject({
            externalId: "B000000002",
            thumbnail: null,
            brand: null,
            price: { value: null, originalValue: null },
            rating: { average: null, totalReviews: null },
        })
    })

    it("discards an original price that is not greater than the price", async () => {
        mockItems([
            { title: "Igual", url: "/dp/B000000003", price: "R$ 10,00", originalPrice: "R$ 10,00" },
            { title: "Menor", url: "/dp/B000000004", price: "R$ 10,00", originalPrice: "R$ 5,00" },
        ])

        const items = await ctx.scraper.searchProducts({ query: "x" })

        expect(items.map((i) => i.price.originalValue)).toEqual([null, null])
    })

    it("keeps the original price when the price is missing or invalid", async () => {
        mockItems([
            { title: "Sem preço", url: "/dp/B000000005", originalPrice: "R$ 20,00" },
            { title: "Preço inválido", url: "/dp/B000000006", price: "abc", originalPrice: "R$ 20,00" },
        ])

        const items = await ctx.scraper.searchProducts({ query: "x" })

        expect(items[0].price).toMatchObject({ value: null, originalValue: 20 })
        expect(items[1].price).toMatchObject({ value: null, originalValue: 20 })
    })

    it("turns unparsable numbers into null", async () => {
        mockItems([
            {
                title: "Inválido",
                url: "/dp/B000000007",
                price: "R$ 10,00",
                originalPrice: "abc",
                rating: "abc",
                totalReviews: "abc",
            },
        ])

        const [item] = await ctx.scraper.searchProducts({ query: "x" })

        expect(item.price).toMatchObject({ value: 10, originalValue: null })
        expect(item.rating).toEqual({ average: null, totalReviews: null })
    })

    it("falls back to puppeteer on captcha and encodes the query and page", async () => {
        ctx.got.fetch.mockResolvedValue({ body: "validateCaptcha", asHtmlParser: vi.fn() })
        ctx.puppeteer.fetch.mockResolvedValue({
            body: LONG_OK_HTML,
            asHtmlParser: () => ({ extractModel: async () => ({ items: [] }) }),
        })

        await ctx.scraper.searchProducts({ query: "echo dot", page: 2 })

        expect(ctx.puppeteer.fetch).toHaveBeenCalledWith({ url: "https://www.amazon.com.br/s?k=echo%20dot&page=2" })
    })
})

describe("AmazonScraper.close", () => {
    it("closes the puppeteer client", async () => {
        const { scraper, puppeteer } = makeScraper()

        await scraper.close()

        expect(puppeteer.close).toHaveBeenCalled()
    })
})
