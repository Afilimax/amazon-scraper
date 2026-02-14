import { HtmlParser } from "@xcrap/extractor"
import { Marketplace } from "@afilimax/core"
import path from "node:path"
import fs from "node:fs"

import { createLogger } from "../src/helpers/logger.helper"
import { AmazonScraper } from "../src/amazon"

describe("Amazon Scraper", () => {
    describe("extractProduct", () => {
        it("should extract product data correctly from fixture", async () => {
            const fixturesDir = path.join(__dirname, "fixtures")
            const fileNames = await fs.promises.readdir(fixturesDir)
            const filePaths = fileNames.map((fileName) => path.join(fixturesDir, fileName))

            for (const filePath of filePaths) {
                const htmlContent = await fs.promises.readFile(filePath, "utf-8")
                const parser = new HtmlParser(htmlContent)
                const url = "https://www.amazon.com.br/ExamcpleLink/dp/B075357582"

                const logger = createLogger(true)

                const product = await AmazonScraper.extractProduct({
                    parser: parser,
                    url: url,
                    logger: logger
                })

                expect(product).toBeDefined()
                expect(product.title).toBeDefined()
                expect(product.marketplace).toBe(Marketplace.Amazon)
                expect(product.scrapedAt).toBeDefined()
            }
        })
    })
})
