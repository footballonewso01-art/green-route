import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ProfileLinkCard } from "@/components/profile/ProfileLinkCard";
import { LINK_CARD_STYLE_IDS } from "@/lib/profileAppearance";
import {
  getNewLinkHrefForFilter,
  resolveNewLinkProfilePrefill,
} from "@/lib/linkProfileContext";
import { buildProfileLinkUpdateFormData } from "@/lib/profileLinkPersistence";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Public Profile link persistence", () => {
  it("renders a saved background image in every link card style", () => {
    LINK_CARD_STYLE_IDS.forEach((cardStyle) => {
      const { container, unmount } = render(
        <ProfileLinkCard
          title={`${cardStyle} link`}
          destinationUrl="https://example.com/destination"
          backgroundUrl="/saved-link-background.webp"
          template="classic"
          cardColor="#101311"
          cardStyle={cardStyle}
          preview
        />,
      );

      expect(container.querySelector('img[src="/saved-link-background.webp"]')).toBeInTheDocument();
      unmount();
    });
  });

  it("keeps core Link CRUD in Links and persists only profile-card composition in Profile", () => {
    const dashboard = readWorkspaceFile("src/pages/DashboardProfile.tsx");
    const linkCard = readWorkspaceFile("src/components/profile/ProfileLinkEditorCard.tsx");

    expect(dashboard).toContain("collection('profile_links').create");
    expect(dashboard).toContain("buildProfileLinkUpdateFormData(presentation, bgImageFile, bgImageRemoved)");
    expect(dashboard).toContain("collection('profile_links').update(id, formData");
    expect(dashboard).toContain("collection('profile_links').delete(id");
    expect(dashboard).toContain("Create in Links");
    expect(dashboard).toContain('"Save Profile Settings"');
    expect(linkCard).toContain("Promise<boolean>");
    expect(linkCard).toContain("Save card");
    expect(linkCard).toContain("Edit in Links");

    expect(dashboard).not.toContain("pendingBgImages");
    expect(dashboard).not.toContain("temp-");
    expect(dashboard).not.toContain("unsaved");
    expect(dashboard).not.toContain("Syncing profile links");
  });

  it("sends uploaded and removed backgrounds through the PocketBase bg_image field", () => {
    const background = new File(["image"], "card-background.webp", { type: "image/webp" });
    const link = {
      title_override: "  Creator store  ",
      size: "large" as const,
    };

    const upload = buildProfileLinkUpdateFormData(link, background, false);
    expect(upload.get("title_override")).toBe("Creator store");
    expect(upload.get("bg_image")).toBe(background);

    const removal = buildProfileLinkUpdateFormData(link, null, true);
    expect(removal.get("bg_image")).toBe("");

    const unchanged = buildProfileLinkUpdateFormData(link, null, false);
    expect(unchanged.has("bg_image")).toBe(false);
  });

  it("prefills New Link from the active Links profile filter", () => {
    const linksManager = readWorkspaceFile("src/pages/LinksManager.tsx");
    const createLink = readWorkspaceFile("src/pages/CreateLink.tsx");

    expect(linksManager).toContain("createLinkHref");
    expect(linksManager).toContain("getNewLinkHrefForFilter(selectedProfileFilter)");
    expect(createLink).toContain('searchParams.get("profile")');

    expect(getNewLinkHrefForFilter("all")).toBe("/dashboard/links/create");
    expect(getNewLinkHrefForFilter("profile-1")).toBe("/dashboard/links/create?profile=profile-1");
    expect(getNewLinkHrefForFilter("none")).toBe("/dashboard/links/create?profile=none");

    expect(resolveNewLinkProfilePrefill("profile-1", [{ id: "profile-1" }, { id: "profile-2" }]))
      .toEqual({ showOnProfile: true, profileId: "profile-1", collapseSelector: true });
    expect(resolveNewLinkProfilePrefill("none", [{ id: "profile-1" }]))
      .toEqual({ showOnProfile: false, profileId: "", collapseSelector: false });
    expect(resolveNewLinkProfilePrefill(null, [{ id: "profile-1" }]))
      .toEqual({ showOnProfile: false, profileId: "profile-1", collapseSelector: false });
  });

  it("does not truncate large link collections at 100 records", () => {
    const dashboard = readWorkspaceFile("src/pages/DashboardProfile.tsx");
    const linksManager = readWorkspaceFile("src/pages/LinksManager.tsx");
    const publicProfile = readWorkspaceFile("src/pages/PublicProfile.tsx");

    expect(dashboard).toContain("getFullList<ProfileLinkRecord>");
    expect(dashboard).toContain("getFullList<CoreLinkRecord>");
    expect(linksManager).toContain("getFullList<LinkItem>");
    expect(publicProfile).toContain("getFullList<ProfileLinkRecord>");
    expect(dashboard).not.toContain("getList<ProfileLinkRecord>(1, 100");
    expect(linksManager).not.toContain("getList<LinkItem>(1, 100");
    expect(publicProfile).not.toContain("getList<ProfileLinkRecord>(1, 100");
  });

  it("enforces composition ownership and keeps a rollback-safe legacy validator", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
    const migration = readWorkspaceFile("pocketbase/pb_migrations/1784520000_create_profile_links.js");

    expect(hook.match(/validateLinkRecordForMutation\(\$app, e\.record\)/g)).toHaveLength(2);
    expect(hook.match(/validateProfileLinkComposition/g)).toHaveLength(2);
    expect(utils).toContain("var validateLinkProfileAssignment = function(record, app)");
    expect(utils).toContain("validateLinkProfileAssignment(record, app || $app)");
    expect(utils).toContain("var validateProfileLinkComposition = function(record, authInfo)");
    expect(utils).toContain("The Public Profile and Link must belong to the same account.");
    expect(migration).toContain('name: "profile_links"');
    expect(migration).toContain("idx_profile_links_profile_link");
    expect(migration).toContain("WHERE profile_id != '' AND show_on_profile = 1");
    expect(migration).toContain("cascadeDelete: true");
  });
});
