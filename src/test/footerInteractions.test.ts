import fs from "node:fs";
import path from "node:path";
import postcss, { type Rule } from "postcss";
import { describe, expect, it } from "vitest";

const stylesheet = postcss.parse(fs.readFileSync(
  path.join(process.cwd(), "src/components/Footer.module.css"),
  "utf8",
));

function rulesFor(selector: string): Rule[] {
  const rules: Rule[] = [];
  stylesheet.walkRules((rule) => {
    if (rule.selectors.includes(selector)) rules.push(rule);
  });
  return rules;
}

function declarations(rule: Rule): Record<string, string> {
  const values: Record<string, string> = {};
  rule.walkDecls(({ prop, value }) => { values[prop] = value; });
  return values;
}

describe("footer link interactions", () => {
  it("paints the underline within each link without transformed pseudo-elements", () => {
    const [baseRule] = rulesFor(".navLink");
    expect(baseRule).toBeDefined();
    expect(declarations(baseRule)).toMatchObject({
      "background-size": "0% 1px",
      "background-repeat": "no-repeat",
      transition: "color 180ms ease, background-size 220ms var(--landing-ease-out)",
    });

    stylesheet.walkRules((rule) => {
      if (!/\.(?:navLink|navColumn|bottomBar)\b/.test(rule.selector)) return;
      expect(rule.selector).not.toMatch(/::(?:before|after)/);
      const values = declarations(rule);
      for (const property of ["transform", "opacity", "filter", "will-change"]) {
        expect(values).not.toHaveProperty(property);
      }
    });
  });

  it.each(["hover", "focus-visible"])("limits %s feedback to the active link", (state) => {
    const rules = rulesFor(`.navLink:${state}`);
    expect(rules).toHaveLength(1);
    expect(declarations(rules[0])).toMatchObject({
      color: "var(--landing-media-text)",
      "background-size": "100% 1px",
    });
    stylesheet.walkRules((rule) => {
      if (!rule.selector.includes(`:${state}`)) return;
      expect(rule.selector).not.toMatch(/\.(?:landingFooter|footerBody|footerGrid|navColumn|bottomBar):(?:hover|focus-within)/);
    });
  });

  it("retains hover feedback but disables its animation for reduced motion", () => {
    const [hoverRule] = rulesFor(".navLink:hover");
    expect(hoverRule.parent).toMatchObject({
      type: "atrule",
      name: "media",
      params: "(hover: hover) and (pointer: fine)",
    });
    const reducedRule = rulesFor(".navLink").find((rule) =>
      rule.parent?.type === "atrule" && rule.parent.params === "(prefers-reduced-motion: reduce)",
    );
    expect(reducedRule).toBeDefined();
    expect(declarations(reducedRule!)).toMatchObject({ transition: "none" });
  });
});
