// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TemplateProfilePreview from "@/components/templates/TemplateProfilePreview";
import { PROFILE_TEMPLATE_IDS } from "@/lib/profileTemplates";

describe("template preview server rendering", () => {
  it.each(PROFILE_TEMPLATE_IDS)("renders %s without browser globals or extra page landmarks", (template) => {
    expect(typeof window).toBe("undefined");
    const html = renderToStaticMarkup(<TemplateProfilePreview template={template} />);
    expect(html).toContain(`data-profile-template="${template}"`);
    expect(html).toContain("Nora Lane");
    expect(html).toContain("data:image/svg+xml,");
    for (const match of html.matchAll(/src="data:image\/svg\+xml,([^"]+)"/g)) {
      expect(decodeURIComponent(match[1])).toContain('xmlns="http://www.w3.org/2000/svg"');
    }
    expect(html).not.toContain("<main");
    expect(html).not.toContain("<h1");
  });
});
