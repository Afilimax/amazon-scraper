import { PuppeteerExtraClient, PuppeteerExtraClientOptions } from "@xcrap/puppeteer-extra-client"
import { GotScrapingClient, GotScrapingClientOptions } from "@xcrap/got-scraping-client"
import AmazonCaptchaPlugin from "@mihnea.dev/puppeteer-extra-amazon-captcha"
import { extract, HtmlParser, xpath } from "@xcrap/extractor"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { Transformer } from "@xcrap/transformer"
import { HttpResponse } from "@xcrap/core"
import { Logger } from "winston"

import { scrapedProductSchema, ScrapedProduct, ScrapedProductPreview, Marketplace } from "@afilimax/core"

import { removeRefSegment, removeQueryParams, extractProductAsinFromUrl } from "./utils"
import { searchResultsExtractionModel } from "./extraction-models/search-results.model"
import { productTransformationModel } from "./transforming-models/product.model"
import { productExtractionModel } from "./extraction-models/product.model"
import { createLogger } from "./helpers/logger.helper"

export type AmazonScraperOptions = {
    puppeteer?: PuppeteerExtraClientOptions
    gotScraping?: GotScrapingClientOptions
    quiet?: boolean
}

export type AmazonScraperGetProductOptions = {
    url: string
}

export type AmazonScraperSearchProductsOptions = {
    query: string
    page?: number
}

export type ExtractProductOptions = {
    url: string
    parser: HtmlParser
    logger?: Logger
}

export class AmazonScraper {
    private readonly puppeteerClient: PuppeteerExtraClient
    private readonly gotScrapingClient: GotScrapingClient
    private readonly quiet: boolean
    private readonly logger: Logger

    constructor({ puppeteer, gotScraping, quiet }: AmazonScraperOptions = {}) {
        this.puppeteerClient = new PuppeteerExtraClient({
            plugins: [StealthPlugin(), AmazonCaptchaPlugin(), ...(puppeteer?.plugins ?? [])],
            headless: "new" as any,
            ...puppeteer,
        })

        this.gotScrapingClient = new GotScrapingClient(gotScraping)
        this.quiet = quiet ?? false
        this.logger = createLogger(this.quiet)
    }

    private hasCaptchaHtml(html: string): boolean {
        return (
            html.length < 30000 ||
            html.includes("validateCaptcha") ||
            html.includes("Amazon CAPTCHA") ||
            html.includes("/errors/validateCaptcha") ||
            html.includes("api-services-support@amazon.com")
        )
    }

    async getProductPageParser({ url }: AmazonScraperGetProductOptions): Promise<HtmlParser> {
        this.logger.debug(`Getting product from URL: ${url}`)

        url = removeQueryParams(removeRefSegment(url))

        this.logger.debug(`Cleaned URL: ${url}`)
        this.logger.debug("Using Got Scraping Client")

        let response = await this.gotScrapingClient.fetch({ url: url })

        if (this.hasCaptchaHtml(response.body)) {
            this.logger.debug("Using Puppeter Extra Client")
            response = await this.puppeteerClient.fetch({ url: url })
        }

        this.logger.debug("Parsing HTML from response")

        return response.asHtmlParser()
    }

    async getProduct({ url }: AmazonScraperGetProductOptions): Promise<ScrapedProduct> {
        const parser = await this.getProductPageParser({ url: url })

        return await AmazonScraper.extractProduct({
            parser: parser,
            url: url,
            logger: this.logger,
        })
    }

    static async extractProduct({ parser, url, logger }: ExtractProductOptions) {
        logger?.debug("Extracting data from HTML")

        const extractedData = await parser.extractModel({ model: productExtractionModel })

        logger?.debug("Transforming extracted data")

        const fullPriceString = `${extractedData.currentPriceWhole}.${extractedData.currentPriceFraction}`.replace(
            ",",
            "",
        )

        const transformer = new Transformer({ ...extractedData, url: url, price: fullPriceString })
        const transformedData = (await transformer.transform(productTransformationModel)) as any

        return scrapedProductSchema.parse({
            ...transformedData,
            images: transformedData.images.length > 0 ? transformedData.images : null,
            features: transformedData.features.length > 0 ? transformedData.features : null,
            specifications: transformedData.specifications.length > 0 ? transformedData.specifications : null,
            coupons: null,
            categories: null,
            scrapedAt: new Date().toISOString(),
        })
    }

    async searchProducts({ query, page = 1 }: AmazonScraperSearchProductsOptions): Promise<ScrapedProductPreview[]> {
        const encodedQuery = encodeURIComponent(query)
        const url = `https://www.amazon.com.br/s?k=${encodedQuery}&page=${page}`

        this.logger.debug(`Searching products with query: "${query}" (page ${page})`)
        this.logger.debug(`Search URL: ${url}`)

        let response = await this.gotScrapingClient.fetch({ url })

        if (this.hasCaptchaHtml(response.body)) {
            this.logger.debug("Captcha detected, switching to Puppeteer Extra Client")
            response = await this.puppeteerClient.fetch({ url })
        }

        this.logger.debug(`Fetched HTML length: ${response.body.length}`)
        const parser = response.asHtmlParser()

        this.logger.debug("Extracting search results from HTML")

        const extracted = (await parser.extractModel({ model: searchResultsExtractionModel })) as any
        const items: any[] = extracted.items ?? []
        this.logger.debug(`Extracted items count: ${items.length}`)
        const scrapedAt = new Date().toISOString()

        const filtered = items.filter((item) => item.title && item.url)
        return filtered.map((item): ScrapedProductPreview => {
                const fullUrl = item.url.startsWith("http") ? item.url : `https://www.amazon.com.br${item.url}`

                const priceValue = item.price ? parseFloat(item.price.replace(/[^\d,\.]/g, "").replace(",", ".")) : null

                let originalPriceValue = item.originalPrice
                    ? parseFloat(item.originalPrice.replace(/[^\d,\.]/g, "").replace(",", "."))
                    : null

                if (
                    originalPriceValue !== null &&
                    priceValue !== null &&
                    !isNaN(originalPriceValue) &&
                    !isNaN(priceValue) &&
                    originalPriceValue <= priceValue
                ) {
                    originalPriceValue = null
                }

                const ratingAverage = item.rating ? parseFloat(item.rating.replace(",", ".").split(" ")[0]) : null

                const totalReviews = item.totalReviews
                    ? parseInt(item.totalReviews.replace(/\./g, "").replace(/,/g, ""), 10)
                    : null

                return {
                    marketplace: Marketplace.Amazon,
                    externalId: item.asin ?? extractProductAsinFromUrl(fullUrl),
                    title: item.title.trim(),
                    url: fullUrl,
                    thumbnail: item.thumbnail ?? null,
                    price: {
                        value: isNaN(priceValue as number) ? null : priceValue,
                        originalValue: isNaN(originalPriceValue as number) ? null : originalPriceValue,
                        currency: "BRL",
                    },
                    rating: {
                        average: isNaN(ratingAverage as number) ? null : ratingAverage,
                        totalReviews: isNaN(totalReviews as number) ? null : totalReviews,
                    },
                    brand: item.brand ?? null,
                    scrapedAt,
                }
            })
    }

    async close() {
        await this.puppeteerClient.close()
    }
}
