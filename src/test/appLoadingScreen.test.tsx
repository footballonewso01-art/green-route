import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const { authState } = vi.hoisted(() => ({
  authState: { user: null as null | { id: string }, loading: true, isAdmin: false },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/useSeo", () => ({ useSeo: vi.fn() }));

import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { AdminRoute } from "@/components/AdminRoute";

const bootHtml = readFileSync("index.html", "utf8");
const loadingCss = readFileSync("src/components/AppLoadingScreen.css", "utf8");
const landingCss = readFileSync("src/styles/landing-rebrand.css", "utf8");

afterEach(() => {
  cleanup();
  Object.assign(authState, { user: null, loading: true, isAdmin: false });
});

describe("app loading screen", () => {
  it("announces loading without exposing a decorative spinner as content", () => {
    render(<AppLoadingScreen />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("Loading…");
    expect(status.querySelector(".app-loading-screen__spinner")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("keeps the HTML boot screen and React fallback identical", () => {
    render(<AppLoadingScreen />);
    const bootDocument = new DOMParser().parseFromString(bootHtml, "text/html");
    const bootStatus = bootDocument.querySelector("#root > .app-loading-screen");
    const normalizeMarkup = (value: string) => value.replace(/>\s+</g, "><").trim();
    expect(normalizeMarkup(bootStatus?.outerHTML || "")).toBe(normalizeMarkup(screen.getByRole("status").outerHTML));
    expect(bootDocument.querySelector('link[href="/src/components/AppLoadingScreen.css"]')?.getAttribute("rel")).toBe("stylesheet");
    expect(bootHtml).toContain("<!--app-root-start-->");
    expect(bootHtml).toContain("<!--app-root-end-->");
  });

  it("matches the Hero colors even before landing styles load", () => {
    for (const token of ["landing-media", "landing-accent"]) {
      const color = landingCss.match(new RegExp(`--${token}: ([^;]+);`))?.[1];
      expect(color).toBeTruthy();
      expect(loadingCss).toContain(`var(--${token}, ${color})`);
    }
    expect(loadingCss).not.toMatch(/(?:^|\n)(?:body|html|:root)\s*\{/);
  });

  it("disables rotation for reduced motion without hiding the loading message", () => {
    expect(loadingCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.app-loading-screen__spinner\s*\{\s*animation: none;/);
    expect(loadingCss).not.toContain("display: none");
  });
});

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<h1>Admin content</h1>} />
        </Route>
        <Route path="/login" element={<h1>Login page</h1>} />
        <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("admin loading presentation preserves access control", () => {
  it("shows the shared screen while authentication is unresolved", () => {
    Object.assign(authState, { user: { id: "admin" }, isAdmin: true });
    renderAdminRoute();
    expect(screen.getByRole("status")).toHaveClass("app-loading-screen");
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  it("still redirects guests to login", () => {
    authState.loading = false;
    renderAdminRoute();
    expect(screen.getByRole("heading", { name: "Login page" })).toBeInTheDocument();
  });

  it("still redirects non-admin users to the dashboard", () => {
    Object.assign(authState, { user: { id: "member" }, loading: false });
    renderAdminRoute();
    expect(screen.getByRole("heading", { name: "Dashboard page" })).toBeInTheDocument();
  });

  it("still renders authorized content after loading", () => {
    Object.assign(authState, { user: { id: "admin" }, loading: false, isAdmin: true });
    renderAdminRoute();
    expect(screen.getByRole("heading", { name: "Admin content" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
