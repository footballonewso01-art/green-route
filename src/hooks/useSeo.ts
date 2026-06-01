import { useEffect } from "react";

export interface FAQItem {
  question: string;
  answer: string;
}

interface SeoOptions {
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  faq?: FAQItem[];
  structuredData?: Record<string, any>;
}

export function useSeo({ title, description, canonical, noIndex, ogImage, twitterCard, faq, structuredData }: SeoOptions) {
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

    // 8. JSON-LD Structured Data Injection
    const jsonLdElements: HTMLScriptElement[] = [];

    if (faq && faq.length > 0) {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq.map((item) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      };

      const faqScript = document.createElement("script");
      faqScript.type = "application/ld+json";
      faqScript.id = "jsonld-faq";
      faqScript.text = JSON.stringify(faqSchema);
      document.head.appendChild(faqScript);
      jsonLdElements.push(faqScript);
    }

    if (structuredData) {
      const genericScript = document.createElement("script");
      genericScript.type = "application/ld+json";
      genericScript.id = "jsonld-structured";
      genericScript.text = JSON.stringify(structuredData);
      document.head.appendChild(genericScript);
      jsonLdElements.push(genericScript);
    }

    // Cleanup added schemas on unmount
    return () => {
      jsonLdElements.forEach((element) => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  }, [title, description, canonical, noIndex, ogImage, twitterCard, faq, structuredData]);
}

