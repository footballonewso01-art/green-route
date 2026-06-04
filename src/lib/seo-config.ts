export interface PageSeoConfig {
  title: string;
  description: string;
  canonical: string;
  noIndex?: boolean;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
}

export const SEO_PAGES: Record<string, PageSeoConfig> = {
  home: {
    title: "Linktery — Link in Bio & Traffic Analytics Platform",
    description: "Linktery is a professional link-in-bio and traffic management platform. Design premium custom profiles, set geo & device targeting, and track dynamic analytics in real-time.",
    canonical: "/",
  },
  pricing: {
    title: "Pricing & Plans | Linktery",
    description: "Find the perfect plan for your links and traffic. Start free with the Creator plan or upgrade to Creator Pro or Agency for advanced targeting, custom domains, and zero branding.",
    canonical: "/pricing",
  },
  login: {
    title: "Login | Linktery",
    description: "Sign in to your Linktery account to access your biolink profiles, smart routing links, and analytics dashboard.",
    canonical: "/login",
    noIndex: true,
  },
  register: {
    title: "Create Your Account | Linktery",
    description: "Register a free account on Linktery. Build premium link-in-bio pages, configure device & geo-targeting rules, and capture deep analytics today.",
    canonical: "/register",
    noIndex: true,
  },
  privacy: {
    title: "Privacy Policy | Linktery",
    description: "Read the Privacy Policy of Linktery. Understand how we collect, use, and safeguard your personal information and biolink traffic data.",
    canonical: "/privacy",
  },
  terms: {
    title: "Terms & Conditions | Linktery",
    description: "Review the Terms & Conditions of Linktery. Learn about account registrations, user content rules, subscription payments, and usage terms.",
    canonical: "/terms",
  },
  // Reusable placeholders for upcoming landing/alternative pages
  linktreeAlternative: {
    title: "Best Link-in-Bio Tools & Linktree Alternatives (2026) | Linktery",
    description: "Compare the best link-in-bio tools for Instagram and TikTok. Discover features, pricing, analytics, and choose the right platform for creators and businesses.",
    canonical: "/alternatives/linktree",
  },
  beaconsAlternative: {
    title: "Linktery vs Beacons: Best Bio-Link Comparison | Linktery",
    description: "Compare Linktery vs Beacons. Analyze premium customization capabilities, device & location targeting features, pricing structures, and analytics to select the best tool.",
    canonical: "/alternatives/beacons",
  },
  lnkBioAlternative: {
    title: "Best Lnk.Bio Alternative: Fastest Bio Link for Creators (2026) | Linktery",
    description: "Compare Lnk.Bio vs Linktery. Discover the fastest pre-rendered (SSG) link-in-bio tool with built-in app deep linking, unlimited links, and advanced rotator split testing.",
    canonical: "/alternatives/lnk-bio",
  },
  onlyfansSolution: {
    title: "OnlyFans Link in Bio: Safe Sharing on Instagram & TikTok | Linktery",
    description: "Learn how to safely share OnlyFans links on Instagram & TikTok without bans or shadowbans. Secure your creator profile with link cloaking and custom domains.",
    canonical: "/solutions/onlyfans-link-in-bio",
  },
  telegramSolution: {
    title: "Telegram Link in Bio: Optimize Social Traffic & Conversions | Linktery",
    description: "Boost your Telegram channel growth. Seamlessly redirect Instagram and TikTok traffic to native applications, preventing drop-offs and optimizing user conversions.",
    canonical: "/solutions/telegram-bio-link",
  },
  affiliateSolution: {
    title: "Affiliate Link Rotator: Optimize CPA Traffic & A/B Split | Linktery",
    description: "Maximize your CPA marketing ROI. Set up multi-variant link rotators, distribute traffic by custom weights, and verify visitor quality safely.",
    canonical: "/solutions/affiliate-smart-link-rotator",
  },
  bioLinkTool: {
    title: "Best Free Link in Bio Tool for Instagram & TikTok (2026) | Linktery",
    description: "Create a beautiful, custom link-in-bio page for your social media profiles. Organize all your links, build custom templates, and bypass in-app browser jails free.",
    canonical: "/solutions/bio-link-tool",
  },
  smartRedirect: {
    title: "Smart URL Redirect & Traffic Routing Engine | Linktery",
    description: "Route campaign clicks dynamically by device OS, geolocation, or A/B split weights. Filter bots, protect ad account compliance, and scale campaign yields.",
    canonical: "/solutions/smart-link-redirect",
  },
  deeplinkGenerator: {
    title: "Deeplink Generator: Open Links Directly in Apps | Linktery",
    description: "Bypass Instagram, TikTok, and YouTube in-app browsers. Create mobile deep links (deep links) to route users directly into native apps.",
    canonical: "/solutions/deeplink-generator",
  },
  fitnessCoachSolution: {
    title: "Link in Bio for Fitness Coaches & Nutritionists | Linktery",
    description: "Build a beautiful, high-converting link-in-bio profile for your personal training and nutrition coaching business. Sell workout plans and track client signups.",
    canonical: "/solutions/link-in-bio-for-fitness-coaches",
  },
  youtubeSmartLinks: {
    title: "YouTube Description Smart Links: Bypass In-App Browser | Linktery",
    description: "Bypass the YouTube in-app browser jail. Route your description link clicks directly into native apps (Instagram, Telegram, Spotify) to boost subscriber conversions.",
    canonical: "/solutions/youtube-smart-links",
  },
  musicSmartLinks: {
    title: "Music Smart Links: Spotify Pre-Save & App Deep Linking | Linktery",
    description: "Create beautiful music smart links. Redirect listeners directly to Spotify, Apple Music, and YouTube Music native apps to double your streams and pre-saves.",
    canonical: "/solutions/music-smart-links",
  },
  digitalProductsSmartLinks: {
    title: "Gumroad & Lemon Squeezy Smart Links: Maximize Sales | Linktery",
    description: "Bypass conversion-killing in-app browsers. Redirect buyers directly to Safari or Chrome with active Apple/Google Pay sessions to double your digital product sales.",
    canonical: "/solutions/digital-product-smart-links",
  },
  podcastSmartLinks: {
    title: "Podcast Smart Links: Apple & Spotify Podcasts Redirection | Linktery",
    description: "Maximize your podcast subscribers. Generate universal smart links that open directly in Apple Podcasts and Spotify native apps, bypassing webview login walls.",
    canonical: "/solutions/podcast-smart-links",
  },
  shopifySmartLinks: {
    title: "Shopify & E-commerce Smart Links: Bypass Webview Checkout Frictions | Linktery",
    description: "Maximize your mobile sales conversions. Redirect Instagram and TikTok bio traffic directly to Safari or Chrome native browsers with active Apple Pay, Google Pay, and Shop Pay sessions.",
    canonical: "/solutions/shopify-smart-links",
  },
  fanvueSmartLinks: {
    title: "Fanvue & AI Influencer Smart Links: Link Rotators & Ban Shield | Linktery",
    description: "Protect your AI model profiles from bans. Use advanced link cloaking, rotate traffic across multiple Fanvue/Fansly destinations, and bypass in-app browser login blocks.",
    canonical: "/solutions/fanvue-ai-models",
  },
  geoTargetedRedirect: {
    title: "Geo-Targeting & Multilingual Redirect: Smart Link Localization | Linktery",
    description: "Route global clicks dynamically. Automatically detect visitor country or browser language to redirect traffic to localized stores, currency checkout pages, or translation links.",
    canonical: "/solutions/geo-targeted-redirect",
  },
  amazonSmartLinks: {
    title: "Amazon Affiliate Smart Links: Open Amazon App Directly | Linktery",
    description: "Generate Amazon Associate smart links. Bypass in-app webviews to redirect mobile clicks directly to the native Amazon shopping app, doubling your affiliate conversions.",
    canonical: "/solutions/amazon-smart-links",
  },
  linkMeAlternative: {
    title: "Best Link.me Alternative: Manage Multiple Profiles (2026) | Linktery",
    description: "Compare Link.me vs Linktery. Unlock multi-profile management to run separate bio-link pages for different brands under one account, with instant SSG loading and deep links.",
    canonical: "/alternatives/link-me",
  },
  ugcPortfolio: {
    title: "Free UGC Creator Portfolio & Link in Bio Tool (2026) | Linktery",
    description: "Build a stunning UGC creator portfolio in minutes. Embed TikTok & Reels mockups, display video engagement metrics, integrate rate cards, and share your landing page with brands.",
    canonical: "/solutions/ugc-portfolio",
  },
  qrCodeBiolink: {
    title: "Free Dynamic QR Code Generator for Business Cards & Retail (2026) | Linktery",
    description: "Generate dynamic QR codes for business cards, retail menus, and storefronts. Link directly to your custom bio-link, track scan analytics, and update destinations instantly without reprinting.",
    canonical: "/solutions/qr-code-biolink",
  },
};


