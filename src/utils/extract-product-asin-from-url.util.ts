import { regexHelper } from "../helpers/regex.helper"

export function extractProductAsinFromUrl(url: string): string {
    const match = url.match(regexHelper.asin)

    if (!match) {
        throw new Error(`Could not extract product ASIN from URL: ${url}`)
    }

    return match[1]
}
