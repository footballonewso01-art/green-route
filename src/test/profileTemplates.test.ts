import { describe, expect, it } from "vitest";
import {
  normalizeProfileBackgroundMode,
  normalizeProfileBackgroundOverlay,
  normalizeProfileBackgroundPosition,
  normalizeProfileTemplate,
  PROFILE_TEMPLATE_IDS,
  supportsProfileImageBackground,
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

  it("limits custom image backgrounds to canvas-safe templates", () => {
    expect(supportsProfileImageBackground("compact")).toBe(true);
    expect(supportsProfileImageBackground("visual")).toBe(true);
    expect(supportsProfileImageBackground("classic")).toBe(false);
    expect(supportsProfileImageBackground("banner")).toBe(false);
    expect(supportsProfileImageBackground("hero")).toBe(false);
    expect(supportsProfileImageBackground("cutout")).toBe(false);
  });

  it("normalizes profile background controls safely", () => {
    expect(normalizeProfileBackgroundMode("image")).toBe("image");
    expect(normalizeProfileBackgroundMode("unknown")).toBe("color");
    expect(normalizeProfileBackgroundPosition("bottom")).toBe("bottom");
    expect(normalizeProfileBackgroundPosition("left")).toBe("center");
    expect(normalizeProfileBackgroundOverlay("strong")).toBe("strong");
    expect(normalizeProfileBackgroundOverlay(undefined)).toBe("balanced");
  });
});
