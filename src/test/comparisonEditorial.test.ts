import { describe, expect, it } from "vitest";
import { comparisonEditorial } from "@/components/comparisons/comparisonEditorial";
import { getComparisonFaq, resolveComparison } from "@/components/comparisons/comparisonData";
import indexable from "@/data/indexable-comparisons.json";

describe("pair-specific comparison analysis", () => {
  it("deepens existing URLs without expanding the indexable catalogue", () => {
    expect(indexable).toHaveLength(16);
    for (const [slug, editorial] of Object.entries(comparisonEditorial)) {
      expect(indexable).toContain(slug);
      expect(editorial.sections).toHaveLength(4);
      expect(editorial.sources.length).toBeGreaterThanOrEqual(2);
      expect(editorial.sources.every((source) => source.href.startsWith("https://"))).toBe(true);
      expect(getComparisonFaq(...resolveComparison(slug)!)).toEqual(editorial.faq);
    }
    const titles = Object.values(comparisonEditorial).flatMap((entry) => entry.sections.map((section) => section.title));
    expect(new Set(titles).size).toBe(titles.length);
  });
});
