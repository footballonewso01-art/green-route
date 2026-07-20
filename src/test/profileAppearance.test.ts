import {
  LINK_CARD_STYLE_IDS,
  normalizeLinkCardStyle,
  normalizeSocialLinkStyle,
  SOCIAL_LINK_STYLE_IDS,
} from "@/lib/profileAppearance";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public profile appearance settings", () => {
  it("keeps every supported link card style and falls back safely", () => {
    LINK_CARD_STYLE_IDS.forEach((style) => {
      expect(normalizeLinkCardStyle(style)).toBe(style);
    });

    expect(normalizeLinkCardStyle("unknown")).toBe("glass");
    expect(normalizeLinkCardStyle(undefined)).toBe("glass");
  });

  it("keeps every supported social style and falls back safely", () => {
    SOCIAL_LINK_STYLE_IDS.forEach((style) => {
      expect(normalizeSocialLinkStyle(style)).toBe(style);
    });

    expect(normalizeSocialLinkStyle("unknown")).toBe("icons");
    expect(normalizeSocialLinkStyle(null)).toBe("icons");
  });

  it("persists and validates presentation settings without changing profile tracking URLs", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const migration = readWorkspaceFile("pocketbase/pb_migrations/1784365000_add_profile_presentation_styles.js");
    const publicProfile = readWorkspaceFile("src/pages/PublicProfile.tsx");

    expect(hook.match(/validateProfilePresentation/g)).toHaveLength(2);
    expect(utils).toContain('"image-first": true');
    expect(utils).not.toContain('"labeled-rows": true');
    expect(migration).toContain('name: "link_card_style"');
    expect(migration).toContain('name: "social_link_style"');
    expect(publicProfile).toContain('href: `/${item.link.slug}?ref=profile`');
  });

  it("keeps the phone viewport flush and the classic image fade continuous", () => {
    const dashboard = readWorkspaceFile("src/pages/DashboardProfile.tsx");
    const identity = readWorkspaceFile("src/components/profile/ProfileIdentity.tsx");
    const styles = readWorkspaceFile("src/index.css");

    expect(dashboard).toContain('data-profile-preview-viewport="390x812"');
    expect(dashboard).toContain('h-[812px] w-[391px] origin-top-left');
    expect(dashboard).toContain('style={{ transform: "scale(0.7692307692)" }}');
    expect(dashboard).toContain("overflow-x-hidden overflow-y-auto overscroll-contain");
    expect(dashboard).not.toContain("border-surface p-1");
    expect(styles).toContain(".no-scrollbar::-webkit-scrollbar");
    expect(styles).toContain("scrollbar-width: none");
    expect(identity).toContain("solidFrom = 72");
    expect(identity).toContain("linear-gradient(to bottom, transparent 0%, ${cardColor} ${solidFrom}%, ${cardColor} 100%)");
    expect(identity).toContain('data-card-theme-transition="true"');
    expect(identity).toContain('data-card-theme-seam-guard="true"');
    expect(identity).toContain("aspect-[5/4]");
    expect(identity).toContain("solidFrom={90}");
    expect(identity).toContain('className="absolute inset-x-0 bottom-0 h-[54%]"');
    expect(identity).not.toContain("linear-gradient(to top, ${cardColor} 15%, transparent)");
  });

  it("keeps the Cutout Editorial username below the portrait frame", () => {
    const identity = readWorkspaceFile("src/components/profile/ProfileIdentity.tsx");
    const cutoutSection = identity.slice(
      identity.indexOf('if (template === "cutout")'),
      identity.indexOf("\n  return (\n    <section>", identity.indexOf('if (template === "cutout")')),
    );

    expect(cutoutSection).toContain("-mt-3");
    expect(cutoutSection).toContain("min-[380px]:-mt-4");
    expect(cutoutSection).not.toContain("min-[380px]:-mt-8");
  });

  it("joins every image fade to the card theme with a solid overlap guard", () => {
    const identity = readWorkspaceFile("src/components/profile/ProfileIdentity.tsx");
    const canvas = readWorkspaceFile("src/components/profile/ProfileCanvas.tsx");
    const bannerSection = identity.slice(
      identity.indexOf('if (template === "banner")'),
      identity.indexOf('if (template === "hero")'),
    );

    expect(bannerSection).toContain("style={{ backgroundColor: cardColor }}");
    expect(bannerSection).toContain("<CardThemeFade");
    expect(bannerSection).toContain("absolute inset-x-0 top-0 z-[1] h-48");
    expect(identity).toContain("absolute inset-x-0 -bottom-[3px] h-[8px]");
    expect(canvas).toContain('data-card-theme-content="true"');
    expect(canvas).toContain("relative -mt-[2px]");
    expect(canvas).toContain("style={{ backgroundColor: cardColor }}");
    expect(bannerSection).not.toContain("transparent 20%");
  });

  it("uses the avatar or Sunset blur as the only public profile backdrop", () => {
    const dashboard = readWorkspaceFile("src/pages/DashboardProfile.tsx");
    const publicProfile = readWorkspaceFile("src/pages/PublicProfile.tsx");
    const migration = readWorkspaceFile("pocketbase/pb_migrations/1784365600_simplify_profile_background_and_social_style.js");

    expect(dashboard).not.toContain("Background Theme");
    expect(dashboard).toContain('theme: "sunset"');
    expect(publicProfile).toContain("from-orange-500/45 via-pink-500/30 to-purple-900/55");
    expect(publicProfile).toContain("profile.full_avatar_url");
    expect(migration).toContain("social_link_style = 'icons'");
    expect(migration).toContain("theme = 'sunset'");
  });
});
