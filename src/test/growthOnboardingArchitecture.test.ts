import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("growth onboarding architecture", () => {
  it("keeps legacy account usernames compatible while the hero reserves a profile slug", () => {
    const landing = read("src/pages/LandingPage.tsx");
    const register = read("src/pages/RegisterPage.tsx");

    expect(landing).toContain("/register?profile=");
    expect(landing).not.toContain("/register?username=${usernameInput");
    expect(register).toContain('searchParams.get("username") || ""');
    expect(register).toContain('searchParams.get("profile") || ""');
    expect(register).toContain("claimStarterProfile(reservedProfileSlug)");
    expect(register).not.toContain("setUsername(reservedProfileSlug)");
    expect(register).not.toContain("username: reservedProfileSlug");

    const reservationMigration = read("pocketbase/pb_migrations/1787456100_add_profile_slug_reservations.js");
    expect(reservationMigration).not.toMatch(/(?:UPDATE|ALTER|DELETE FROM)\s+users\b/i);
  });

  it("claims the reservation transactionally and prevents link/profile races", () => {
    const hooks = read("pocketbase/pb_hooks/main.pb.js");
    const migration = read("pocketbase/pb_migrations/1787456100_add_profile_slug_reservations.js");
    const worker = read("cloudflare/worker.ts");

    expect(hooks).toContain('routerAdd("POST", "/api/onboarding/profile-reservation"');
    expect(hooks).toContain('routerAdd("POST", "/api/onboarding/profile-claim"');
    expect(hooks).toContain("$app.runInTransaction((txApp) =>");
    expect(migration).toContain("block_reserved_profile_slug_insert");
    expect(migration).toContain("block_reserved_link_slug_insert");
    expect(worker).toContain('url.pathname === "/api/onboarding/profile-claim"');
  });

  it("tracks server-authoritative activation and billing milestones", () => {
    const hooks = read("pocketbase/pb_hooks/main.pb.js");
    for (const event of [
      "signup_completed",
      "profile_created",
      "link_created",
      "checkout_started",
      "checkout_completed",
      "renewal_paid",
    ]) expect(hooks).toContain(`eventName: "${event}"`);
  });
});
