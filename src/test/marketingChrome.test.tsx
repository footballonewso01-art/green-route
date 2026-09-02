import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; email: string; avatar: string },
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const ignored = new Set(["initial", "whileInView", "viewport", "transition"]);
  const staticDiv = (props: Record<string, unknown>) => React.createElement(
    "div",
    Object.fromEntries(Object.entries(props).filter(([key]) => !ignored.has(key))),
  );
  return { motion: { div: staticDiv }, useReducedMotion: () => true };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: {
    files: {
      getUrl: vi.fn(),
    },
  },
}));

import Footer from "@/components/Footer";
import footerStyles from "@/components/Footer.module.css";
import MarketingHeader from "@/components/MarketingHeader";

describe("marketing page chrome", () => {
  beforeEach(() => {
    authState.user = null;
  });

  it("opens a complete mobile navigation and closes it with Escape", () => {
    render(
      <MemoryRouter>
        <MarketingHeader current="home" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/register");

    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    const menu = document.getElementById("mobile-marketing-navigation");
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
    expect(within(menu!).getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features");
    expect(within(menu!).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(within(menu!).getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/documentation");
    expect(within(menu!).getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("mobile-marketing-navigation")).not.toBeInTheDocument();
  });

  it("closes the mobile menu after choosing a destination", () => {
    render(
      <MemoryRouter>
        <MarketingHeader current="home" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const menu = document.getElementById("mobile-marketing-navigation");
    fireEvent.click(within(menu!).getByRole("link", { name: "Documentation" }));
    expect(document.getElementById("mobile-marketing-navigation")).not.toBeInTheDocument();
  });

  it("renders only authenticated navigation controls after the client boundary mounts", async () => {
    authState.user = { id: "user00000000001", name: "Sam", email: "sam@example.com", avatar: "" };
    render(
      <MemoryRouter>
        <MarketingHeader current="home" />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: /Dashboard/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start free" })).not.toBeInTheDocument();
  });

  it("ends the landing page with one primary action and compact link groups", () => {
    render(
      <MemoryRouter>
        <Footer variant="landing" />
      </MemoryRouter>,
    );

    const cta = screen.getByRole("region", { name: "Put your next link to work." });
    const heading = within(cta).getByRole("heading", { level: 2, name: "Put your next link to work." });
    const action = within(cta).getByRole("link", { name: "Start free" });
    expect(action).toHaveAttribute("href", "/register");
    // Separate grid children keep the action vertically centered beside the copy.
    expect(action.parentElement).toBe(cta);
    expect(heading.parentElement?.parentElement).toBe(cta);
    expect(cta.children).toHaveLength(2);

    const product = screen.getByRole("navigation", { name: "Linktery product" });
    const discover = screen.getByRole("navigation", { name: "Discover Linktery" });
    const resources = screen.getByRole("navigation", { name: "Linktery resources" });
    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(within(product).getAllByRole("link")).toHaveLength(3);
    expect(within(discover).getAllByRole("link")).toHaveLength(2);
    expect(within(resources).getAllByRole("link")).toHaveLength(3);
    expect(within(legal).getAllByRole("link")).toHaveLength(2);
    const destinations = [product, discover, resources, legal].flatMap((nav) =>
      within(nav).getAllByRole("link").map((link) => link.getAttribute("href")),
    );
    expect(destinations).toEqual([
      "/features", "/pricing", "/templates", "/solutions", "/tools",
      "/documentation", "/features/public-api", "/guides", "/privacy", "/terms",
    ]);
    for (const nav of [product, discover, resources, legal]) {
      for (const link of within(nav).getAllByRole("link")) {
        expect(link).toHaveClass(footerStyles.navLink);
      }
    }
    expect(screen.queryByText("Follow us on:")).not.toBeInTheDocument();
  });

  it("keeps the default footer unchanged on other pages", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);

    expect(screen.getByRole("link", { name: "Start for free" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("navigation", { name: "Explore Linktery" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Discover Linktery" })).not.toBeInTheDocument();
  });
});
