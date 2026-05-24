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
  onlyfansSolution: {
    title: "OnlyFans Link in Bio: Safe Sharing on Instagram & TikTok | Linktery",
    description: "Learn how to safely share OnlyFans links on Instagram & TikTok without bans or shadowbans. Secure your creator profile with link cloaking and custom domains.",
    canonical: "/solutions/onlyfans-link-in-bio",
  },
};
