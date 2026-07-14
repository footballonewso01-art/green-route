import { describe, expect, it } from "vitest";
import {
  normalizeProfileTemplate,
  PROFILE_TEMPLATE_IDS,
} from "@/lib/profileTemplates";

describe("profile templates", () => {
  it("keeps every supported template id", () => {
    for (const template of PROFILE_TEMPLATE_IDS) {
      expect(normalizeProfileTemplate(template)).toBe(template);
    }
  });

  it("falls back to classic for missing or unsupported values", () => {
    expect(normalizeProfileTemplate(undefined)).toBe("classic");
    expect(normalizeProfileTemplate("")).toBe("classic");
    expect(normalizeProfileTemplate("unknown-template")).toBe("classic");
  });
});
