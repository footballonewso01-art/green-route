import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Link editor accessibility contracts", () => {
  it("uses a keyboard-operable switch with an explicit accessible name", () => {
    const source = read("src/pages/CreateLink.tsx");

    expect(source).toContain('role="switch"');
    expect(source).toContain("aria-checked={checked}");
    expect(source).toContain("aria-labelledby={labelId}");
    expect(source).toContain("aria-describedby={descriptionId}");
    expect(source).not.toContain("onClick={() => onChange(!checked)}>\n      <div");
    expect(source).toContain('aria-label={`About ${label}`}');
  });

  it("names every icon-only Link manager action", () => {
    const source = read("src/pages/LinksManager.tsx");

    expect(source).toContain('aria-label="Use bento view"');
    expect(source).toContain('aria-label="Use list view"');
    expect(source).toContain('aria-label={`Copy ${link.title || link.slug} link`}');
    expect(source).toContain('aria-label={`Show QR code for ${link.title || link.slug}`}');
    expect(source).toContain('aria-label={`View analytics for ${link.title || link.slug}`}');
    expect(source).toContain('aria-label={`Edit ${link.title || link.slug}`}');
    expect(source).toContain('aria-label={`Delete ${link.title || link.slug}`}');
    expect(source).toContain('aria-label="Close QR code"');
  });
});
