import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CreateProfileDialog } from "@/components/profile/CreateProfileDialog";
import { ProfileLibraryCard } from "@/components/profile/ProfileLibraryCard";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Profile library redesign", () => {
  it("presents a visual profile card with one accessible primary action", () => {
    render(
      <ProfileLibraryCard
        profile={{
          id: "profile-1",
          slug: "creator",
          name: "Creator Studio",
          profileTemplate: "hero",
          cardColor: "#101311",
          linkCount: 4,
          fullUrl: "https://linktery.com/creator",
        }}
        onEdit={vi.fn()}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit Creator Studio profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Creator Studio profile URL" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Creator Studio public profile" }))
      .toHaveAttribute("href", "https://linktery.com/creator");
    expect(screen.getByText("Hero Portrait")).toBeInTheDocument();
    expect(screen.getByText("4 links")).toBeInTheDocument();
    expect(screen.getByText("linktery.com/creator")).toBeInTheDocument();
  });

  it("uses an accessible URL-first creation dialog without conflating account usernames", () => {
    render(
      <CreateProfileDialog
        open
        onOpenChange={vi.fn()}
        domains={["linktery.com", "linktery.bio"]}
        domain="linktery.com"
        onDomainChange={vi.fn()}
        slug=""
        onSlugChange={vi.fn()}
        name=""
        onNameChange={vi.fn()}
        currentProfiles={1}
        profileLimit={3}
        planName="Creator Pro"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Create a Public Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Profile name")).toBeInTheDocument();
    expect(screen.getByLabelText("Public URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create & customize" })).toBeDisabled();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(/Slug\s*\/\s*Username/i)).not.toBeInTheDocument();
  });

  it("keeps the library responsive and removes the legacy custom portal treatment", () => {
    const hub = readWorkspaceFile("src/pages/ProfileHub.tsx");
    const card = readWorkspaceFile("src/components/profile/ProfileLibraryCard.tsx");
    const dialog = readWorkspaceFile("src/components/profile/CreateProfileDialog.tsx");

    expect(hub).toContain("lg:grid-cols-2 2xl:grid-cols-3");
    expect(hub).toContain("<CreateProfileDialog");
    expect(hub).not.toContain("createPortal");
    expect(hub).not.toContain("Profile Slug / Username");
    expect(card).toContain("<DropdownMenu");
    expect(card).toContain("Delete profile");
    expect(dialog).toContain("Create &amp; customize");
    expect(dialog).not.toContain("animate-pulse");
  });
});
