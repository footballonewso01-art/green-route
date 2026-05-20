// Stripe Price IDs
// IMPORTANT: Both sets are kept for reference. The export ALWAYS uses LIVE prices.
// For local testing with test prices, set VITE_STRIPE_MODE=test in .env.local (NOT .env)

export const STRIPE_PRICES = {
    pro: {
        monthly: "price_1T9ogj1kCVZzZn9tLvSa7km6",
        annual: "price_1TA5k11kCVZzZn9tvsRkAGHW",
    },
    agency: {
        monthly: "price_1T9ojK1kCVZzZn9tmOrvoNOn",
        annual: "price_1TA5kT1kCVZzZn9tAP7AsNjs",
    }
};

// Test prices for local dev (use via .env.local: VITE_STRIPE_MODE=test)
// pro monthly: price_1TA5an1kCVZzZn9tUlnIjzjp
// pro annual:  price_1TA5mP1kCVZzZn9toW9b7xcU
// agency monthly: price_1TA5ay1kCVZzZn9thZD9Rhsi
// agency annual:  price_1TA5mh1kCVZzZn9tN3UmsgCC
