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
    title: "Linktery — Link In Bio & Analytics",
    description: "Create link-in-bio profiles and managed short links, route traffic by device or country, and measure clicks and profile engagement with Linktery.",
    canonical: "/",
  },
  featuresIndex: {
    title: "Linktery Features: Smart Links, Profiles & Analytics",
    description: "Explore Linktery features for short links, public profiles, analytics, deep linking, routing, custom domains, QR codes, and API workflows.",
    canonical: "/features",
  },
  templatesIndex: {
    title: "Link-in-Bio Templates for Public Profiles | Linktery",
    description: "Compare Linktery public-profile templates, including Classic Cover, Compact Circle, Banner Circle, Hero Portrait, and Cutout Editorial.",
    canonical: "/templates",
  },
  guidesIndex: {
    title: "Link Management & Link-in-Bio Guides | Linktery",
    description: "Learn how to build, route, brand, measure, and maintain short links and link-in-bio profiles with practical Linktery guides.",
    canonical: "/guides",
  },
  toolsIndex: {
    title: "Free UTM Builder & URL QR Code Tools | Linktery",
    description: "Use Linktery's free UTM builder and URL QR code generator, then connect the result to managed links and analytics when needed.",
    canonical: "/tools",
  },
  documentation: {
    title: "Linktery API Documentation | Smart Links & Analytics",
    description: "Use the Linktery API to create and update smart links, read Public Profiles, and connect aggregate link analytics to your own dashboards.",
    canonical: "/documentation",
  },
  pricing: {
    title: "Pricing & Plans | Linktery",
    description: "Compare Linktery plans. Upgrade to Creator Pro or Agency for Public API access, advanced targeting, analytics, custom domains, and brand controls.",
    canonical: "/pricing",
  },
  login: {
    title: "Sign in",
    description: "Sign in to your Linktery account to access your biolink profiles, smart routing links, and analytics dashboard.",
    canonical: "/login",
    noIndex: true,
  },
  register: {
    title: "Create account",
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

  onlyfansSolution: {
    title: "OnlyFans Link in Bio for Instagram & TikTok | Linktery",
    description: "Build a branded creator link page for OnlyFans audiences, use custom domains, and route visitors with clear, policy-safe landing experiences.",
    canonical: "/solutions/onlyfans-link-in-bio",
  },
  telegramSolution: {
    title: "Telegram Link in Bio & App Routing | Linktery",
    description: "Create Telegram smart links that attempt supported native-app handoffs, retain a safe web fallback, and measure incoming social traffic.",
    canonical: "/solutions/telegram-bio-link",
  },
  affiliateSolution: {
    title: "Affiliate Link Rotator & A/B Traffic Split | Linktery",
    description: "Set up multi-destination affiliate link rotators, distribute traffic evenly, compare click activity, and keep campaign destinations current.",
    canonical: "/solutions/affiliate-smart-link-rotator",
  },
  bioLinkTool: {
    title: "Free Link-in-Bio Tool for Instagram & TikTok | Linktery",
    description: "Create a customizable link-in-bio page, organize important destinations, choose a responsive template, and measure profile engagement.",
    canonical: "/solutions/bio-link-tool",
  },
  smartRedirect: {
    title: "Smart URL Redirect & Traffic Routing Engine | Linktery",
    description: "Route campaign clicks by device or country, keep a reliable default destination, or distribute visits evenly across active link variants.",
    canonical: "/solutions/smart-link-redirect",
  },
  deeplinkGenerator: {
    title: "Deeplink Generator: Open Links Directly in Apps | Linktery",
    description: "Create smart links that attempt supported native-app or external-browser handoffs and retain a reliable HTTPS fallback.",
    canonical: "/solutions/deeplink-generator",
  },
  fitnessCoachSolution: {
    title: "Link in Bio for Fitness Coaches & Nutritionists | Linktery",
    description: "Build a beautiful, high-converting link-in-bio profile for your personal training and nutrition coaching business. Sell workout plans and track client signups.",
    canonical: "/solutions/link-in-bio-for-fitness-coaches",
  },
  youtubeSmartLinks: {
    title: "YouTube Description Smart Links & App Routing | Linktery",
    description: "Create managed YouTube description links with app-aware destinations, web fallbacks, routing rules, and click analytics.",
    canonical: "/solutions/youtube-smart-links",
  },
  musicSmartLinks: {
    title: "Music Smart Links: Spotify Pre-Save & App Deep Linking | Linktery",
    description: "Create beautiful music smart links and route listeners to Spotify, Apple Music, and YouTube Music with native-app deep linking where supported.",
    canonical: "/solutions/music-smart-links",
  },
  digitalProductsSmartLinks: {
    title: "Gumroad & Lemon Squeezy Smart Links: Maximize Sales | Linktery",
    description: "Reduce in-app browser checkout friction by routing buyers to Safari or Chrome, where existing Apple Pay or Google Pay sessions may be available.",
    canonical: "/solutions/digital-product-smart-links",
  },
  podcastSmartLinks: {
    title: "Podcast Smart Links for Apple Podcasts & Spotify | Linktery",
    description: "Create podcast smart links for Apple Podcasts and Spotify with supported native-app handoffs, web fallbacks, and click analytics.",
    canonical: "/solutions/podcast-smart-links",
  },
  shopifySmartLinks: {
    title: "Shopify & E-commerce Smart Links | Linktery",
    description: "Create managed commerce links with mobile routing, browser fallbacks, campaign analytics, and destinations for Shopify or other stores.",
    canonical: "/solutions/shopify-smart-links",
  },
  fanvueSmartLinks: {
    title: "Fanvue & AI Influencer Smart Links: Link Rotators | Linktery",
    description: "Build branded landing pages for AI model profiles, rotate traffic across Fanvue or Fansly destinations, and reduce in-app browser friction.",
    canonical: "/solutions/fanvue-ai-models",
  },
  geoTargetedRedirect: {
    title: "Geo-Targeted Links & Localized Redirects | Linktery",
    description: "Route clicks to configured country-specific stores, currencies, languages, or regional resources while keeping a reliable default destination.",
    canonical: "/solutions/geo-targeted-redirect",
  },
  amazonSmartLinks: {
    title: "Amazon Affiliate Smart Links: Open Amazon App Directly | Linktery",
    description: "Generate Amazon Associate smart links and route compatible mobile clicks to the native Amazon shopping app to reduce in-app browser friction.",
    canonical: "/solutions/amazon-smart-links",
  },

  ugcPortfolio: {
    title: "Free UGC Creator Portfolio & Link-in-Bio Tool | Linktery",
    description: "Build a UGC creator portfolio with video examples, profile links, rate information, and a shareable mobile landing page for brands.",
    canonical: "/solutions/ugc-portfolio",
  },
  qrCodeBiolink: {
    title: "Dynamic QR Codes for Business Cards & Retail | Linktery",
    description: "Use managed-link QR codes for cards, menus, and retail campaigns, track visits, and update destinations without reprinting the code.",
    canonical: "/solutions/qr-code-biolink",
  },
  solutionsIndex: {
    title: "Traffic Routing & Conversion Solutions | Linktery",
    description: "Explore Linktery use cases for creators, brands, and marketers across link-in-bio pages, app-aware links, geo-routing, and weighted rotators.",
    canonical: "/solutions",
  },
  alternativesIndex: {
    title: "Link-in-Bio Alternatives & Platform Comparisons | Linktery",
    description: "Compare 18 link-in-bio and link-management platforms side-by-side, including pricing, analytics, custom domains, QR codes, and routing features.",
    canonical: "/alternatives",
  },
};
