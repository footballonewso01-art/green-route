import { competitors } from "@/components/alternatives/alternativeData";
import { comparisonEditorial } from "./comparisonEditorial";

export type ComparisonProduct = (typeof competitors)[number];

interface ProductBrief {
  category: string;
  summary: string;
  check: string;
  availability?: string;
}

// Pair-neutral editorial summaries of the primary-source reviews. Keep the
// alternative pages' migration copy out of a comparison between two providers.
export const productBriefs: Record<string, ProductBrief> = {
  linktree: {
    category: "Creator bio pages",
    summary: "A bio page with themes, media, selling tools, and audience collection. Paid plans add more reporting and control over the page.",
    check: "If your own domain is essential, check the page URL policy first. Also verify the exact conditions supported by Premium smart routing.",
  },
  beacons: {
    category: "Creator commerce",
    summary: "A creator workspace combining a bio page, digital-product storefront, email marketing, and media kits.",
    check: "Include selling fees in the total cost. Check the plan needed for branding removal and whether email or membership tools are part of your daily workflow.",
  },
  "lnk-bio": {
    category: "Flexible bio pages",
    summary: "A page builder with embeds, scheduled links, and both monthly and one-time purchase options.",
    check: "Separate a one-time page purchase from recurring domain and commerce add-ons. Trial the exact embeds and scheduled content you plan to publish.",
  },
  bento: {
    availability: "Sunset announced",
    category: "Portfolio migration",
    summary: "An existing visual portfolio to rebuild following Bento’s sunset notice. This is a migration decision, not a new subscription option.",
    check: "Keep copies of project tiles, media, and outbound URLs you control. Confirm remaining account access; do not assume another provider can import or recover the page.",
  },
  "link-me": {
    category: "Creator operations",
    summary: "Profiles alongside monetization, mobile management, global analytics, and multiple-client workflows.",
    check: "List any merchandise, courses, or paid content you use. Verify profile limits and collaborative access separately instead of treating them as the same feature.",
  },
  taplink: {
    category: "Mobile micro-sites",
    summary: "Compact sites with media and messenger links, plus forms, payments, and digital products on Business.",
    check: "Try the forms and payment blocks your page needs. Test social-app handoffs on both iOS and Android and confirm the plan for your own domain.",
  },
  shorby: {
    category: "Social & messenger pages",
    summary: "Smart Pages that collect social content, website links, and messenger destinations in one public entry point.",
    check: "Confirm current subscription terms directly. Test each messenger’s account, number, and prefilled text, then verify domain and tracking requirements.",
  },
  campsite: {
    category: "Rich bio pages",
    summary: "Bio pages with carousels, feeds, groups, and opt-in forms, alongside brand controls and collaboration options.",
    check: "Recreate a real carousel and opt-in flow. Check collaborator permissions and reporting retention as well as custom-domain and branding entitlements.",
  },
  milkshake: {
    category: "Phone-first websites",
    summary: "A mobile website editor for iOS and Android built around visual, swipeable cards. Paid options add domain and marketing tools.",
    check: "Edit a complete page on the phone you use every day. Check current Pro+ domain and Google Analytics terms; pricing can vary by region and billing period.",
  },
  "bio-link": {
    category: "Audience & content pages",
    summary: "Customizable pages with posts, email collection, apps, and an AI assistant, with domain and reporting options.",
    check: "Try the content and subscriber workflow, not only the layout. Confirm the billing period and test destination rules independently of page customization.",
  },
  "direct-me": {
    category: "Audience-focused profiles",
    summary: "Profiles with custom themes, email collection, live analytics, and additional brand controls through VIP.",
    check: "Check where subscribers and ongoing communication will live. Confirm current VIP domain and integration terms before replacing your published address.",
  },
  flowpage: {
    category: "QR-linked brand hubs",
    summary: "Flowcode’s current destination offering is FlowHubs: branded mobile hubs, personalized content, and enterprise workflows.",
    check: "Ask which current product and contract apply to your Flowpage account. Inventory printed QR codes and verify who controls their URLs before making changes.",
  },
  koji: {
    availability: "Retired service",
    category: "Retired creator platform",
    summary: "A retired service, not an active subscription choice. The practical task is rebuilding the public page and any connected product experiences.",
    check: "Use original content and product files you already control. Choose a replacement for both the public page and any commerce tools; do not rely on an automatic recovery.",
  },
  carrd: {
    category: "One-page websites",
    summary: "A one-page site builder with layout flexibility, forms, embeds, and annual Pro plans for domains and analytics integrations.",
    check: "Test your real forms, scripts, and embeds. Compare annual billing with annual billing, and separate building a website from managing campaign redirects.",
  },
  fanlink: {
    category: "Music release links",
    summary: "ToneDen’s music smart links connect releases to streaming services and support release-specific workflows such as pre-saves.",
    check: "Keep pre-save requirements separate from general bio-page needs. Try each streaming destination with and without its app installed and confirm reporting retention.",
  },
  ohmybio: {
    category: "Links & traffic rules",
    summary: "Bio pages, short URLs, QR codes, targeting, and analytics, including published country, device, language, and split-test options.",
    check: "Test rule priority, unmatched-visitor fallbacks, and weighted destinations with real links. Verify plan limits and the reporting dimensions needed to evaluate those rules.",
  },
  urmybio: {
    availability: "Not independently verified",
    category: "Availability to verify",
    summary: "Current public pricing and feature entitlements could not be independently verified. Start with provider confirmation before comparing a purchase or migration.",
    check: "Request current availability, plan terms, domain support, and export options from the provider. Do not treat missing public information as proof a feature is absent.",
  },
  bitly: {
    category: "Short links & QR codes",
    summary: "A link-management platform covering short URLs, branded links, QR codes, landing pages, and click and scan reporting.",
    check: "Compare monthly creation quotas and analytics retention separately. Confirm the tier for your branded domain, API usage, and supported mobile deep links.",
  },
};

export function comparisonPath(a: ComparisonProduct, b: ComparisonProduct) {
  const pair = [a, b].sort((left, right) => left.slug.localeCompare(right.slug));
  return `/compare/${pair[0].slug}-vs-${pair[1].slug}`;
}

export function resolveComparison(slug: string | undefined) {
  const parts = slug?.split("-vs-") ?? [];
  if (parts.length !== 2 || parts[0] === parts[1]) return null;
  const a = competitors.find((product) => product.slug === parts[0]);
  const b = competitors.find((product) => product.slug === parts[1]);
  if (!a || !b) return null;
  return [a, b].sort((left, right) => left.slug.localeCompare(right.slug)) as [ComparisonProduct, ComparisonProduct];
}

export const factCriteria = [
  { key: "free", label: "Free entry" },
  { key: "paid", label: "Paid plans & billing" },
  { key: "domains", label: "Custom domains" },
  { key: "branding", label: "Branding removal" },
  { key: "routing", label: "Traffic routing" },
  { key: "apps", label: "App destinations" },
  { key: "analytics", label: "Analytics" },
  { key: "fees", label: "Selling & fees" },
] as const;

export function getComparisonRows(a: ComparisonProduct, b: ComparisonProduct) {
  // Retired and unverified products must not look like purchasable plans.
  if (a.migrationOnly || b.migrationOnly) {
    return [
      { label: "Availability", a: productBriefs[a.slug].availability ?? a.facts.free, b: productBriefs[b.slug].availability ?? b.facts.free },
      { label: "Plans", a: a.facts.paid, b: b.facts.paid },
      { label: "Publishing address", a: a.facts.domains, b: b.facts.domains },
    ];
  }
  return factCriteria.map(({ key, label }) => ({ label, a: a.facts[key], b: b.facts[key] }));
}

export function getComparisonFaq(a: ComparisonProduct, b: ComparisonProduct) {
  const editorial = comparisonEditorial[[a.slug, b.slug].sort().join("-vs-")];
  if (editorial) return editorial.faq;
  return [
    {
      question: `How do ${a.name} and ${b.name} differ?`,
      answer: `${a.name}: ${productBriefs[a.slug].summary} ${b.name}: ${productBriefs[b.slug].summary} Choose around the workflow you need to keep, then test it with real content.`,
    },
    {
      question: `How should I compare their prices?`,
      answer: a.migrationOnly || b.migrationOnly
        ? `This pair includes a retired or unverified offering. Confirm availability first; historical prices are not current purchase offers. For an available service, compare the billing period, domain add-ons, required features, and any payment-provider fees.`
        : `${a.name}: ${a.facts.paid}. ${b.name}: ${b.facts.paid}. Compare the same billing period and include add-ons and selling fees. A yearly plan shown as a monthly equivalent is not a month-to-month subscription.`,
    },
    {
      question: `Can I use my own domain?`,
      answer: `${a.name}: ${a.facts.domains}. ${b.name}: ${b.facts.domains}. Confirm the entitlement and DNS requirements before publishing. Owning a domain is different from having a username on a provider’s domain.`,
    },
    {
      question: `What should I test before switching?`,
      answer: `Check your most-used page blocks, the complete mobile click path, and the report you use to judge results. Keep a copy of your content, confirm ownership of domains and QR destinations, and update published links only after the replacement works. Subscriber lists, commerce tools, and analytics history may need separate migration steps.`,
    },
  ];
}
