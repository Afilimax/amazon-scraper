import { HtmlExtractionModel, css, extract } from "@xcrap/extractor"

const productSpecificationsExtractionModel = new HtmlExtractionModel({
    key: {
        query: css("td:nth-child(1) span"),
        extractor: extract("innerText"),
    },
    value: {
        query: css("td:nth-child(2) span"),
        extractor: extract("innerText"),
    },
})

const productFeaturesExtractionModel = new HtmlExtractionModel({
    key: {
        query: css("th.prodDetSectionEntry"),
        extractor: extract("innerText"),
    },
    value: {
        query: css("td.prodDetAttrValue"),
        extractor: extract("innerText"),
    },
})

const productRatingExtractionModel = new HtmlExtractionModel({
    average: {
        query: css(".cm-cr-review-stars-spacing-big span, #acrPopover .a-color-base"),
        extractor: extract("innerText")
    },
    totalReviews: {
        query: css("#acrCustomerReviewText"),
        extractor: extract("innerText")
    }
})

const productAvailabilityExtractionModel = new HtmlExtractionModel({
    inStockText: {
        query: css("span, #kindleExtraMessage"),
        extractor: extract("innerText")
    }
})

const shippingExtractionModel = new HtmlExtractionModel({
    price: {
        query: css("span[data-csa-c-delivery-price]"),
        extractor: extract("data-csa-c-delivery-price"),
    },
    estimatedTime: {
        query: css(".a-text-bold"),
        extractor: extract("innerText")
    }
})

export const productExtractionModel = new HtmlExtractionModel({
    title: {
        query: css("#productTitle"),
        extractor: extract("innerText"),
    },
    currentPriceSymbol: {
        query: css(".a-price-symbol"),
        extractor: extract("innerText"),
    },
    currentPriceWhole: {
        query: css(".a-price-whole"),
        extractor: extract("innerText"),
    },
    currentPriceDecimal: {
        query: css(".a-price-decimal"),
        extractor: extract("innerText"),
    },
    currentPriceFraction: {
        query: css(".a-price-fraction"),
        extractor: extract("innerText"),
    },
    rating: {
        query: css("#averageCustomerReviews_feature_div, #averageCustomerReviews"),
        model: productRatingExtractionModel,
    },
    description: {
        query: css("#productDescription p, div[data-a-expander-name='book_description_expander']"),
        extractor: extract("innerText"),
        default: null
    },
    images: {
        query: css(".imgTagWrapper img"),
        extractor: extract("src"),
        multiple: true,
    },
    brand: {
        query: css("#bylineInfo"),
        extractor: extract("innerText")
    },
    thumbnails: {
        query: css("#altImages img"),
        extractor: extract("src"),
        multiple: true,
    },
    specifications: {
        query: css("#productOverview_feature_div table.a-normal.a-spacing-micro tr"),
        model: productSpecificationsExtractionModel,
        multiple: true,
    },
    features: {
        query: css("#prodDetails table tr"),
        model: productFeaturesExtractionModel,
        multiple: true,
    },
    availability: {
        query: css("#availability, #tmm-grid-swatch-KINDLE"),
        model: productAvailabilityExtractionModel,
    },
    shipping: {
        query: css("#deliveryBlockMessage"),
        model: shippingExtractionModel,
        default: null
    }
})
