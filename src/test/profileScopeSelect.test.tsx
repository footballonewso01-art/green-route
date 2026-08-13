import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import ProfileScopeSelect, {
  ALL_PROFILES_SCOPE,
} from "@/components/analytics/ProfileScopeSelect";

const profiles = [
  { id: "profile00000001", name: "Studio North", slug: "studio-north" },
  { id: "profile00000002", name: "", slug: "daily-links" },
];

const nativeScrollIntoView = Element.prototype.scrollIntoView;

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  Element.prototype.scrollIntoView = nativeScrollIntoView;
});

describe("ProfileScopeSelect", () => {
  it("presents All profiles as a clear aggregate scope", () => {
    render(
      <ProfileScopeSelect
        profiles={profiles}
        value={ALL_PROFILES_SCOPE}
        onValueChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Profile analytics scope" });
    expect(trigger).toHaveTextContent("All profiles");
    expect(trigger).toHaveTextContent("Combined analytics");
    expect(trigger).toHaveTextContent("2 profiles");
    expect(trigger).toHaveClass("h-14", "pr-3");
    expect(trigger.querySelectorAll("svg")).toHaveLength(2);
    expect(trigger).not.toHaveTextContent("Profile scope");
  });

  it("keeps profile identity and public slug visible in the trigger", () => {
    render(
      <ProfileScopeSelect
        profiles={profiles}
        value="profile00000001"
        onValueChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Profile analytics scope" });
    expect(trigger).toHaveTextContent("Studio North");
    expect(trigger).toHaveTextContent("@studio-north");
  });

  it("opens a separate profile menu below the trigger without duplicating the selected item", async () => {
    render(
      <ProfileScopeSelect
        profiles={profiles}
        value={ALL_PROFILES_SCOPE}
        onValueChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Profile analytics scope" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const menu = await screen.findByRole("listbox");
    expect(menu).toHaveAttribute("data-side", "bottom");
    expect(menu).not.toBe(trigger.parentElement);
    expect(screen.getAllByRole("option")).toHaveLength(profiles.length + 1);
  });
});
