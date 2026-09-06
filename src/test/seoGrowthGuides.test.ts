import { describe, expect, it } from "vitest";
import { SEO_CONTENT_PAGES, getSeoContentPage } from "@/lib/seoContent";
import { getGuidePresentation } from "@/components/guides/guidePresentation";

const paths = ["/guides/telegram-link-tracking", "/guides/bot-clicks-in-link-analytics", "/guides/change-link-destination"];
describe("targeted organic acquisition guides", () => {
  it.each(paths)("publishes %s with a complete distinct workflow and inbound links", (path) => {
    const page = getSeoContentPage(path)!;
    expect(page.kind).toBe("guide");
    expect(page.sections).toHaveLength(4);
    expect(page.faqs).toHaveLength(4);
    expect(page.seoTitle.length).toBeLessThanOrEqual(65);
    expect(SEO_CONTENT_PAGES.some((other) => other.path !== path && other.related.includes(path))).toBe(true);
    expect(getGuidePresentation(page).summary).not.toBe(page.lead);
  });
  it("states measurement boundaries instead of promising joins or perfect bot filtering", () => {
    expect(getSeoContentPage(paths[0])!.faqs[0].answer).toContain("Not from a managed-link click alone");
    expect(getSeoContentPage(paths[1])!.faqs[0].answer).toMatch(/^No\./);
    expect(getSeoContentPage(paths[2])!.sections[1].paragraphs.join(" ")).toContain("default URL alone");
  });
});
