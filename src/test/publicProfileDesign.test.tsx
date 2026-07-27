import { render, screen } from "@testing-library/react";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileLinkCard } from "@/components/profile/ProfileLinkCard";
import { ProfileCanvas } from "@/components/profile/ProfileCanvas";
import { LINK_CARD_STYLE_IDS } from "@/lib/profileAppearance";
import { PROFILE_TEMPLATE_IDS } from "@/lib/profileTemplates";

describe("Public Profile design contracts", () => {
  it("renders valid social destinations with accessible names and drops invalid URLs", () => {
    render(
      <ProfileIdentity
        template="compact"
        name="Creator"
        username="creator"
        avatarFallback="C"
        cardColor="#000000"
        socialLinks={[
          {
            id: "instagram",
            url: "https://instagram.com/creator",
            icon_type: "preset",
            icon_value: "instagram",
          },
          {
            id: "invalid",
            url: "not-a-url",
            icon_type: "preset",
            icon_value: "youtube",
          },
        ]}
      />,
    );

    const socialLink = screen.getByRole("link", { name: "Open Instagram" });
    expect(socialLink).toHaveAttribute("href", "https://instagram.com/creator");
    expect(document.querySelector('a[href="#"]')).not.toBeInTheDocument();
  });

  it("preserves the profile redirect URL and exposes the link title", () => {
    render(
      <ProfileLinkCard
        title="My latest project"
        href="/latest?ref=profile"
        destinationUrl="https://example.com/latest"
        iconType="preset"
        iconValue="instagram"
        template="classic"
        cardColor="#000000"
      />,
    );

    const link = screen.getByRole("link", {
      name: "My latest project, opens in a new tab",
    });

    expect(link).toHaveAttribute("href", "/latest?ref=profile");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("My latest project")).toBeInTheDocument();
    expect(screen.queryByText("example.com/latest")).not.toBeInTheDocument();
  });

  it("renders labeled social actions without changing their destinations", () => {
    render(
      <ProfileIdentity
        template="banner"
        name="Creator"
        username="creator"
        avatarFallback="C"
        cardColor="#101311"
        socialStyle="branded-pills"
        socialLinks={[
          {
            id: "instagram",
            url: "https://instagram.com/creator",
            icon_type: "preset",
            icon_value: "instagram",
          },
        ]}
      />,
    );

    const socialLink = screen.getByRole("link", { name: "Open Instagram" });
    expect(socialLink).toHaveTextContent("Instagram");
    expect(socialLink).toHaveAttribute("href", "https://instagram.com/creator");
  });

  it("uses one profile canvas contract for presentation settings and tracked links", () => {
    const { container } = render(
      <ProfileCanvas
        template="cutout"
        linkCardStyle="image-first"
        socialLinkStyle="branded-pills"
        name="Creator"
        username="creator"
        avatarFallback="C"
        cardColor="#101311"
        links={[
          {
            id: "link",
            title: "Latest project",
            href: "/latest?ref=profile",
            destinationUrl: "https://example.com/latest",
          },
        ]}
      />,
    );

    const canvas = container.querySelector("main");
    expect(canvas).toHaveAttribute("data-profile-template", "cutout");
    expect(canvas).toHaveAttribute("data-link-card-style", "image-first");
    expect(canvas).toHaveAttribute("data-social-link-style", "branded-pills");
    expect(screen.getByRole("link", { name: "Latest project, opens in a new tab" }))
      .toHaveAttribute("href", "/latest?ref=profile");
  });

  it("renders every link card style with the same accessible click contract", () => {
    render(
      <div>
        {LINK_CARD_STYLE_IDS.map((style) => (
          <ProfileLinkCard
            key={style}
            title={`${style} destination`}
            href={`/${style}?ref=profile`}
            destinationUrl={`https://example.com/${style}`}
            iconType="preset"
            iconValue="instagram"
            backgroundUrl={style === "image-first" ? "/profile-card-image.webp" : undefined}
            template="compact"
            cardColor="#101311"
            cardStyle={style}
          />
        ))}
      </div>,
    );

    LINK_CARD_STYLE_IDS.forEach((style) => {
      expect(screen.getByRole("link", { name: `${style} destination, opens in a new tab` }))
        .toHaveAttribute("href", `/${style}?ref=profile`);
    });
  });

  it("gives large cards a stronger two-line title hierarchy", () => {
    render(
      <ProfileLinkCard
        title="A featured destination with a longer title"
        href="/featured?ref=profile"
        destinationUrl="https://example.com/featured"
        iconType="preset"
        iconValue="instagram"
        size="large"
        template="classic"
        cardColor="#101311"
      />,
    );

    const title = screen.getByText("A featured destination with a longer title");
    expect(title).toHaveClass("line-clamp-2", "text-[22px]", "leading-[1.15]");
    expect(title).not.toHaveClass("truncate");
  });

  it("lets custom artwork fill the icon surface while preset glyphs keep optical padding", () => {
    const { container } = render(
      <ProfileLinkCard
        title="Custom icon destination"
        href="/custom-icon?ref=profile"
        destinationUrl="https://example.com/custom"
        iconType="custom"
        iconValue="data:image/png;base64,Y3VzdG9t"
        template="classic"
        cardColor="#101311"
      />,
    );

    const customIcon = screen.getByAltText("Custom icon");
    expect(customIcon).toHaveClass("h-full", "w-full", "object-cover");
    expect(customIcon.parentElement).toHaveClass("h-10", "w-10", "overflow-hidden");
    expect(container.querySelector(".h-\\[22px\\] .object-cover")).not.toBeInTheDocument();
  });

  it("keeps preview links non-interactive while using the shared canvas", () => {
    const { container } = render(
      <ProfileCanvas
        preview
        template="hero"
        linkCardStyle="solid"
        socialLinkStyle="icons"
        name="Creator"
        username="creator"
        avatarFallback="C"
        cardColor="#101311"
        links={[
          {
            id: "preview-link",
            title: "Preview destination",
            href: "/preview?ref=profile",
          },
        ]}
      />,
    );

    expect(screen.queryByRole("link", { name: "Preview destination, opens in a new tab" }))
      .not.toBeInTheDocument();
    expect(screen.getByText("Preview destination")).toBeInTheDocument();

    const canvas = container.querySelector("main");
    expect(canvas).toHaveAttribute("data-profile-preview", "true");
    expect(canvas).toHaveClass("border-0", "shadow-none");
    expect(canvas).not.toHaveClass("border");
  });

  it("paints an overlapping card-theme surface behind every template", () => {
    PROFILE_TEMPLATE_IDS.forEach((template) => {
      const { container, unmount } = render(
        <ProfileCanvas
          preview
          template={template}
          linkCardStyle="glass"
          socialLinkStyle="icons"
          name={`${template} creator`}
          username={template}
          avatarFallback="C"
          cardColor="#472524"
          links={[]}
        />,
      );

      const content = container.querySelector<HTMLElement>("[data-card-theme-content='true']");
      expect(content).toHaveClass("-mt-[2px]", "pt-[2px]");
      expect(content).toHaveStyle({ backgroundColor: "#472524" });
      unmount();
    });
  });
});
