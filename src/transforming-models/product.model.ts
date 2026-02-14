import { AnyValidator, get, NumberTransformer, StringTransformer, StringValidator, transform, TransformingModel } from "@xcrap/transformer"

import { extractProductAsinFromUrl, cleanSpecificationTextValue } from "../utils"
import { Marketplace } from "@afilimax/core"

const ratingTransformationModel = new TransformingModel({
    average: [
        transform({
            key: "average",
            transformer: StringTransformer.replace(",", "."),
        }),
        transform({
            key: "average",
            transformer: StringTransformer.toNumber,
        }),
        transform({
            key: "average",
            transformer: (average: number) => average / 5,
        })
    ],
    totalReviews: [
        transform({
            key: "totalReviews",
            transformer: StringTransformer.remove(/\(|\)/g),
        }),
        transform({
            key: "totalReviews",
            transformer: StringTransformer.remove("."),
        }),
        transform({
            key: "totalReviews",
            transformer: StringTransformer.toNumber,
        }),
    ],
})

const priceTransformationModel = new TransformingModel({
    value: [
        transform({
            key: "price",
            transformer: StringTransformer.toNumber,
        }),
        transform({
            key: "price",
            transformer: NumberTransformer.multiply(1000),
        }),
    ],
}).after({
    append: {
        currency: "BRL",
        installment: null,
        originalValue: null,
        pixPrice: null,
    }
})

const featureTransformationModel = new TransformingModel({
    key: [
        transform({
            key: "key",
            transformer: StringTransformer.trim,
        }),
    ],
    value: [
        transform({
            key: "value",
            transformer: cleanSpecificationTextValue,
        }),
    ],
})

const specificationTransformationModel = new TransformingModel({
    key: [
        transform({
            key: "key",
            transformer: StringTransformer.trim,
        }),
    ],
    value: [
        transform({
            key: "value",
            transformer: cleanSpecificationTextValue,
        }),
    ],
})

const availabilityTransformationModel = new TransformingModel({
    inStock: [
        transform({
            key: "inStockText",
            transformer: (inStockText: string) => inStockText.trim() === "Em estoque" || inStockText.trim() === "Disponível instantaneamente",
        }),
    ],
}).after({
    append: {
        quantity: null,   
    }
})

const shippingTransformationModel = new TransformingModel({
    price: [
        get({ key: "price" }),
        transform({
            key: "price",
            condition: StringValidator.isNumeric,
            transformer: StringTransformer.toNumber,
        }),
        transform({
            key: "price",
            condition: AnyValidator.isNumber,
            transformer: NumberTransformer.multiply(1000),
        }),
        transform({
            key: "price",
            condition: AnyValidator.isString,
            transformer: (price: string) => {
                if (price.toUpperCase() === "GRÁTIS") {
                    return null
                }
                
                throw new Error(`Invalid price ${price}`)
            }, 
        }),
    ],
    estimatedTime: [
        get({ key: "estimatedTime" }),
    ],
}).after({
    append: {
        currency: "BRL",
        prime: null,
        full: null,
        freeShipping: null
    }
})

export const productTransformationModel = new TransformingModel({
    title: [
        transform({
            key: "title",
            transformer: StringTransformer.trim,
        }),
    ],
    externalId: [
        transform({
            key: "url",
            transformer: extractProductAsinFromUrl,
        }),
    ],
    description: [
        transform({
            key: "description",
            condition: AnyValidator.isString,
            transformer: StringTransformer.trim,
        }),
        transform({
            key: "description",
            condition: AnyValidator.isString,
            transformer: StringTransformer.collapseWhitespace,
        }),
    ],
    brand: [        
        transform({
            key: "brand",
            transformer: StringTransformer.collapseWhitespace,
        }),
    ],
    price: {
        model: priceTransformationModel,
    },
    rating: {
        key: "rating",
        model: ratingTransformationModel,
    },
    availability: {
        key: "availability",
        model: availabilityTransformationModel,
    },
    features: {
        key: "features",
        multiple: true,
        model: featureTransformationModel,
    },
    specifications: {
        key: "specifications",
        multiple: true,
        model: specificationTransformationModel,
    },
    shipping: {
        key: "shipping",
        condition: (data) => AnyValidator.isObject(data.root.shipping),
        default: null,
        model: shippingTransformationModel,
    },
}).after({
    append: {
        marketplace: Marketplace.Amazon,
        coupons: null,
    },
    delete: [
        "currentPriceSymbol",
        "currentPriceWhole",
        "currentPriceDecimal",
        "currentPriceFraction"
    ]
})
