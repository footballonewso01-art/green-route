// Live Production Prices
const LIVE_PRICES = {
    pro: {
        monthly: "price_1T9ogj1kCVZzZn9tLvSa7km6",
    },
    agency: {
        monthly: "price_1T9ojK1kCVZzZn9tmOrvoNOn",
    }
};

// Test Staging Prices
const TEST_PRICES = {
    pro: {
        monthly: "price_1TA5an1kCVZzZn9tUlnIjzjp",
    },
    agency: {
        monthly: "price_1TA5ay1kCVZzZn9thZD9Rhsi",
    }
};

// Automatically switch to Test Prices if running locally or pointing to Staging PB
const isDev = import.meta.env.DEV;
const isStaging = import.meta.env.VITE_POCKETBASE_URL?.includes('staging');

export const STRIPE_PRICES = (isDev || isStaging) ? TEST_PRICES : LIVE_PRICES;
