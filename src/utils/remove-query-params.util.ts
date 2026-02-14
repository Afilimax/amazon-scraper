export function removeQueryParams(url: string): string {
    try {
        const urlObj = new URL(url)
        return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
    } catch (error) {
        console.error(error)
        return url
    }
}
