import { PRIMARY_ORIGIN } from "@/lib/siteConfig";

/** A top-level marketing page's position in the public site hierarchy. */
export function createPageBreadcrumbSchema(name: string, pathname: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: PRIMARY_ORIGIN },
      { "@type": "ListItem", position: 2, name, item: `${PRIMARY_ORIGIN}${pathname}` },
    ],
  };
}
