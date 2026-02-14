import winston from "winston"

export function createLogger(quiet: boolean) {
    return winston.createLogger({
        level: quiet ? "error" : "debug",
        format: winston.format.json(),
        defaultMeta: { service: "amazon-scraper" },
        transports: [new winston.transports.Console()],
    })
}
