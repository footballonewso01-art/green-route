import { useEffect } from "react";

interface SeoOptions {
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
}

export function useSeo({ title, description, canonical, noIndex, ogImage, twitterCard }: SeoOptions) {
  useEffect(() => {
    // 1. Helper function for meta updates
    const updateMeta = (name: string, content: string, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Title - Use verbatim as configured (which includes custom branding suffixes)
    const finalTitle = title || "Linktery — Link in Bio & Traffic Analytics Platform";
    document.title = finalTitle;
    updateMeta("og:title", finalTitle, true);
    updateMeta("twitter:title", finalTitle);

    // 3. Description
    const finalDesc = description || "Linktery - Smart link-in-bio and traffic management analytics for creators and marketers.";
    updateMeta("description", finalDesc);
    updateMeta("og:description", finalDesc, true);
    updateMeta("twitter:description", finalDesc);

    // 4. Canonical Link (Strips query/UTM parameters from window.location by default)
    const mainDomain = "https://linktery.com";
    let path = window.location.pathname;
    // Canonical standard: normalize homepage path to empty string for trailing slash removal
    if (path === "/") path = "";
    
    const hrefValue = canonical
      ? (canonical.startsWith("http") ? canonical : `${mainDomain}${canonical === "/" ? "" : canonical}`)
      : `${mainDomain}${path}`;

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = hrefValue;
    updateMeta("og:url", hrefValue, true);

    // 5. Open Graph & Twitter Images
    const finalImage = ogImage || `${mainDomain}/og-image.png`;
    updateMeta("og:image", finalImage, true);
    updateMeta("twitter:image", finalImage);

    // 6. Twitter Card Type
    const finalTwitterCard = twitterCard || "summary_large_image";
    updateMeta("twitter:card", finalTwitterCard);

    // 7. Robots Meta Directive (noindex, nofollow)
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
  }, [title, description, canonical, noIndex, ogImage, twitterCard]);
}

