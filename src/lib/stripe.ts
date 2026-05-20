// Live Production Prices
const LIVE_PRICES = {
    pro: {
        monthly: "price_1T9ogj1kCVZzZn9tLvSa7km6",
        annual: "price_1TA5k11kCVZzZn9tvsRkAGHW",
    },
    agency: {
        monthly: "price_1T9ojK1kCVZzZn9tmOrvoNOn",
        annual: "price_1TA5kT1kCVZzZn9tAP7AsNjs",
    }
};

// Test Staging Prices
const TEST_PRICES = {
    pro: {
        monthly: "price_1TA5an1kCVZzZn9tUlnIjzjp",
        annual: "price_1TA5mP1kCVZzZn9toW9b7xcU",
    },
    agency: {
        monthly: "price_1TA5ay1kCVZzZn9thZD9Rhsi",
        annual: "price_1TA5mh1kCVZzZn9tN3UmsgCC",
    }
};

// Use test prices ONLY when explicitly set via env var
// Default = LIVE (safe for production)
const useTestPrices = import.meta.env.VITE_STRIPE_MODE === "test";

export const STRIPE_PRICES = useTestPrices ? TEST_PRICES : LIVE_PRICES;

