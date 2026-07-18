import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("settings account identity", () => {
  it("keeps the account username separate from public profile identity", () => {
    const settings = readWorkspaceFile("src/pages/SettingsPage.tsx");
    const createLink = readWorkspaceFile("src/pages/CreateLink.tsx");
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(settings).toContain("Separate from your Public Profiles");
    expect(settings).toContain("will not change any Bio Link Profile");
    expect(settings).toContain("{ username: cleanUsername }");
    expect(settings).not.toContain("Display Name");
    expect(createLink).not.toContain("existingUsers");
    expect(createLink).not.toContain("reserved by a user profile");
    expect(hook).not.toContain('"username = {:slug}"');
    expect(hook).not.toContain("This username matches an existing link slug.");
  });

  it("enforces normalized unique account usernames on the server", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const migration = readWorkspaceFile("pocketbase/pb_migrations/1784364000_unique_account_usernames.js");

    expect(hook).toContain('.trim().toLowerCase()');
    expect(hook).toContain("/^[a-z0-9_.-]{3,22}$/");
    expect(hook).toContain('e.record.set("name", newUsername);');
    expect(migration).toContain("idx_users_username_nocase");
    expect(migration).toContain("PARTITION BY lower(username)");
  });

  it("merges plan controls and promo codes into Billing without enabling email changes", () => {
    const settings = readWorkspaceFile("src/pages/SettingsPage.tsx");

    expect(settings).toContain('label: "Plan & Billing"');
    expect(settings).not.toContain('id: "subscription"');
    expect(settings).toContain("Turn Off Renewal");
    expect(settings).toContain("Promo Code");
    expect(settings).toContain("Sign-in email");
    expect(settings).not.toContain("requestEmailChange");
  });
});
