import { useEffect } from "react";

interface SeoOptions {
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
}

export function useSeo({ title, description, canonical, noIndex }: SeoOptions) {
  useEffect(() => {
    // 1. Update Title
    if (title) {
      document.title = `${title} | Linktery`;
    } else {
      document.title = "Linktery - Smart Link Management & Traffic Routing";
    }

    // 2. Update Meta Description
    const descContent = description || "Linktery - Smart link management, targeting, and traffic routing analytics for creators.";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", descContent);

    // Update og:description for social shares
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute("content", descContent);
    }

    // 3. Update Canonical Link (Critical to fix Google Search Console duplicate content warnings)
    const mainDomain = "https://linktery.com";
    const hrefValue = canonical
      ? (canonical.startsWith("http") ? canonical : `${mainDomain}${canonical}`)
      : `${mainDomain}${window.location.pathname}`;

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = hrefValue;

    // 4. Update robots directive for staging, private admin directories, or explicit noIndex pages
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.setAttribute("name", "robots");
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute("content", "noindex, nofollow");
    } else {
      // Clean up noindex directives for normal public pages
      if (robotsMeta) {
        robotsMeta.setAttribute("content", "index, follow");
      }
    }
  }, [title, description, canonical, noIndex]);
}
