import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("registration completion UX", () => {
  it("creates a starter Public Profile for ordinary and reserved registrations", () => {
    const register = read("src/pages/RegisterPage.tsx");
    const onboarding = read("src/lib/profileOnboarding.ts");

    expect(register).toContain("finishStarterProfileSetup(cleanUsername)");
    expect(register).toContain("finishStarterProfileSetup(accountUsername)");
    expect(onboarding).toContain("export async function ensureStarterProfile");
    expect(onboarding).toContain('slug: reservation?.slug || ""');
    expect(onboarding).toContain('token: reservation?.token || ""');
  });

  it("uses one consolidated completion toast and keeps simultaneous toasts readable", () => {
    const register = read("src/pages/RegisterPage.tsx");
    const toaster = read("src/components/ui/sonner.tsx");

    expect(register).not.toContain('toast.success("Account created successfully!")');
    expect(register).toContain('toast.success("Account and Public Profile are ready."');
    expect(toaster).toContain("expand={true}");
    expect(toaster).toContain("gap={12}");
  });
});
