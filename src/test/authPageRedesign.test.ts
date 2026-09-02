import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("auth page redesign", () => {
  it("keeps login and registration inside the shared rebrand shell", () => {
    const login = readWorkspaceFile("src/pages/LoginPage.tsx");
    const register = readWorkspaceFile("src/pages/RegisterPage.tsx");

    expect(login).toContain('<AuthShell mode="login">');
    expect(register).toContain('<AuthShell mode="register" reservedProfileSlug={reservedProfileSlug}>');
    expect(register).toContain('reservedProfileSlug ? "Claim your profile."');
    expect(login).not.toContain("canvas");
    expect(register).not.toContain("canvas");
    expect(login).not.toContain("/logo.webp");
    expect(register).not.toContain("/logo.webp");
    expect(register).not.toContain("Start free");
    expect(register).toContain('data-promo-expanded={showPromocode ? "true" : undefined}');
  });

  it("retains accessible auth inputs and browser password-manager hints", () => {
    const login = readWorkspaceFile("src/pages/LoginPage.tsx");
    const register = readWorkspaceFile("src/pages/RegisterPage.tsx");

    expect(login).toContain('htmlFor="login-email"');
    expect(login).toContain('autoComplete="current-password"');
    expect(register).toContain('htmlFor="account-username"');
    expect(register).toContain('autoComplete="username"');
    expect(register).toContain('autoComplete="new-password"');
  });

  it("keeps the visible brand name in the wordmark without repeating it in auth copy", () => {
    const shell = readWorkspaceFile("src/components/auth/AuthShell.tsx");
    const login = readWorkspaceFile("src/pages/LoginPage.tsx");
    const register = readWorkspaceFile("src/pages/RegisterPage.tsx");

    expect(shell).toContain('<BrandWordmark tone="dark" />');
    expect(shell).not.toContain("<span>Linktery</span>");
    expect(shell).toContain('"New here?"');
    expect(login).toContain('<h1>Sign in.</h1>');
    expect(register).toContain('reservedProfileSlug ? "Claim your profile." : "Create your account."');
    expect(login).not.toContain("Sign in to Linktery");
    expect(register).not.toContain("Create your Linktery account");
    expect(register).not.toContain("Private to Linktery");
  });

  it("uses a non-enumerating password-reset response", () => {
    const login = readWorkspaceFile("src/pages/LoginPage.tsx");

    expect(login).toContain('requestPasswordReset(normalizedEmail)');
    expect(login).toContain("If an account exists for this email, a reset link is on its way.");
  });

  it("centers the desktop login form in the viewport with symmetric safe padding", () => {
    const styles = readWorkspaceFile("src/components/auth/AuthShell.module.css");

    expect(styles).toMatch(/@media \(min-width: 64rem\)\s*\{\s*\.page\[data-auth-page="login"\] \.formColumn\s*\{\s*min-height: calc\(100svh - 2rem\);\s*padding-block: 5rem;/);
    expect(styles).toMatch(/\.formColumn\s*\{[^}]*align-items: center;[^}]*justify-content: center;/);
    expect(styles).toMatch(/@media \(min-width: 64rem\) and \(max-height: 44rem\)[\s\S]*?\.page\[data-auth-page="login"\] \.formColumn \{ padding-block: 4\.5rem; \}/);
  });

  it("optically centers the consent checkbox with the label glyphs", () => {
    const styles = readWorkspaceFile("src/components/auth/AuthShell.module.css");

    expect(styles).toMatch(/\.terms\s*\{[^}]*align-items: center;/);
    expect(styles).toMatch(/\.checkbox\s*\{[^}]*margin: 0;/);
    expect(styles).toMatch(/\.checkbox\s*\{[^}]*transform: translateY\(-\.125rem\);/);
  });

  it("uses a two-column desktop shell with an editorial brand scene", () => {
    const shell = readWorkspaceFile("src/components/auth/AuthShell.tsx");
    const styles = readWorkspaceFile("src/components/auth/AuthShell.module.css");

    expect(shell).toContain('data-auth-page={mode}');
    expect(shell).toContain('aria-label="Linktery brand story"');
    expect(shell).toContain('auth-register-sharing.webp');
    expect(shell).toContain('auth-welcome-marketing-lead.webp');
    expect(shell).toContain('mode === "login" ? authWelcomeMarketingLead : authRegisterSharing');
    expect(shell).toContain('"Build what comes next."');
    expect(shell).not.toContain("workspaceCard");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) minmax(28rem, .96fr)");
    expect(styles).toContain("height: calc(100svh - 2rem)");
    expect(styles).toContain('formPanel[data-promo-expanded="true"]');
    expect(styles).toMatch(/@media \(max-width: 63\.99rem\)[\s\S]*\.preview \{ display: none; \}/);
  });
});
