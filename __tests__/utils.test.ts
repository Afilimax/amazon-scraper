import { afterEach, describe, expect, it, vi } from "vitest"

import {
    cleanSpecificationTextValue,
    extractProductAsinFromUrl,
    removeQueryParams,
    removeRefSegment,
} from "../src/utils"
import { createLogger } from "../src/helpers/logger.helper"

afterEach(() => {
    vi.restoreAllMocks()
})

describe("removeQueryParams", () => {
    it("strips the query string and hash", () => {
        expect(removeQueryParams("https://www.amazon.com.br/dp/B075357582?a=1#x")).toBe(
            "https://www.amazon.com.br/dp/B075357582",
        )
    })

    it("returns invalid urls untouched", () => {
        vi.spyOn(console, "error").mockImplementation(() => {})

        expect(removeQueryParams("not a url")).toBe("not a url")
        expect(console.error).toHaveBeenCalled()
    })
})

describe("removeRefSegment", () => {
    it("removes the ref= segment and keeps the query", () => {
        expect(removeRefSegment("https://www.amazon.com.br/dp/B075357582/ref=sr_1_1?a=1")).toBe(
            "https://www.amazon.com.br/dp/B075357582?a=1",
        )
    })

    it("returns invalid urls untouched", () => {
        vi.spyOn(console, "error").mockImplementation(() => {})

        expect(removeRefSegment("not a url")).toBe("not a url")
        expect(console.error).toHaveBeenCalled()
    })
})

describe("cleanSpecificationTextValue", () => {
    it("replaces html entities and trims", () => {
        expect(cleanSpecificationTextValue("  a&nbspb&gtc&lrm&ampd  ")).toBe("a b>c&d")
    })
})

describe("extractProductAsinFromUrl", () => {
    it("extracts the asin", () => {
        expect(extractProductAsinFromUrl("https://www.amazon.com.br/Produto/dp/B075357582/ref=x")).toBe("B075357582")
    })

    it("throws when there is no asin", () => {
        expect(() => extractProductAsinFromUrl("https://www.amazon.com.br/")).toThrow(
            "Could not extract product ASIN from URL",
        )
    })
})

describe("createLogger", () => {
    it("uses the error level when quiet", () => {
        expect(createLogger(true).level).toBe("error")
    })

    it("uses the debug level when not quiet", () => {
        expect(createLogger(false).level).toBe("debug")
    })
})
