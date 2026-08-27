import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/pocketbase", () => ({
  pb: {
    files: {
      getUrl: vi.fn(),
    },
  },
}));

import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";

describe("marketing page chrome", () => {
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

  it("ends the landing page with one primary action and compact link groups", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Put your next link to work." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start for free/ })).toHaveAttribute("href", "/register");

    const explore = screen.getByRole("navigation", { name: "Explore Linktery" });
    const resources = screen.getByRole("navigation", { name: "Linktery resources" });
    expect(within(explore).getAllByRole("link")).toHaveLength(5);
    expect(within(resources).getAllByRole("link")).toHaveLength(5);

    for (const link of [...within(explore).getAllByRole("link"), ...within(resources).getAllByRole("link")]) {
      expect(link).toHaveClass("min-h-11", "whitespace-nowrap");
    }
  });
});
