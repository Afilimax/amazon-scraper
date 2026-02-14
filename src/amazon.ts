import { PuppeteerExtraClient, PuppeteerExtraClientOptions } from "@xcrap/puppeteer-extra-client"
import { GotScrapingClient, GotScrapingClientOptions } from "@xcrap/got-scraping-client"
import AmazonCaptchaPlugin from "@mihnea.dev/puppeteer-extra-amazon-captcha"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { extract, HtmlParser, xpath } from "@xcrap/extractor"
import { Transformer } from "@xcrap/transformer"
import { scrapedProductSchema, ScrapedProduct } from "@afilimax/core"
import { HttpResponse } from "@xcrap/core"
import { Logger } from "winston"

import { productTransformationModel } from "./transforming-models/product.model"
import { productExtractionModel } from "./extraction-models/product.model"
import { removeRefSegment, removeQueryParams } from "./utils"
import { createLogger } from "./helpers/logger.helper"

export type AmazonScraperOptions = {
    puppeteer?: PuppeteerExtraClientOptions
    gotScraping?: GotScrapingClientOptions
    quiet?: boolean
}

export type AmazonScraperGetProductOptions = {
    url: string
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

    private async hasCaptcha(response: HttpResponse) {
        const parser = response.asHtmlParser()

        const hasCaptcha = await parser.extractValue({
            query: xpath(
                "//button[contains(@class, 'a-button-text') and (contains(text(), 'Continuar comprando') or contains(text(), 'Continue shopping'))]",
            ),
            extractor: extract("innerText"),
            default: null,
        })

        return hasCaptcha ? true : false
    }

    async getProductPageParser({ url }: AmazonScraperGetProductOptions): Promise<HtmlParser> {
        this.logger.debug(`Getting product from URL: ${url}`)

        url = removeQueryParams(removeRefSegment(url))

        this.logger.debug(`Cleaned URL: ${url}`)
        this.logger.debug("Using Got Scraping Client")

        let response = await this.gotScrapingClient.fetch({ url: url })

        const hasCaptcha = await this.hasCaptcha(response)

        if (hasCaptcha) {
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
            logger: this.logger
        })
    }

    static async extractProduct({ parser, url, logger }: ExtractProductOptions) {
        logger?.debug("Extracting data from HTML")

        const extractedData = await parser.extractModel({ model: productExtractionModel })

        logger?.debug("Transforming extracted data")

        const fullPriceString = `${extractedData.currentPriceWhole}.${extractedData.currentPriceFraction}`.replace(",", "")

        const transformer = new Transformer({ ...extractedData, url: url, price: fullPriceString })
        const transformedData = await transformer.transform(productTransformationModel) as any

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

    async close() {
        await this.puppeteerClient.close()
    }
}
