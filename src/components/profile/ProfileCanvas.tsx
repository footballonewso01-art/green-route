import { ReactNode } from "react";
import { Globe } from "lucide-react";
import { checkPlan } from "@/lib/plans";
import {
  isLightProfileColor,
  ProfileTemplateId,
} from "@/lib/profileTemplates";
import {
  LinkCardStyleId,
  SocialLinkStyleId,
} from "@/lib/profileAppearance";
import {
  ProfileIdentity,
  ProfileSocialLink,
} from "@/components/profile/ProfileIdentity";
import { ProfileLinkCard } from "@/components/profile/ProfileLinkCard";

export interface ProfileCanvasLink {
  id: string;
  title: string;
  href?: string;
  destinationUrl?: string;
  iconType?: string;
  iconValue?: string;
  size?: "regular" | "large";
  backgroundUrl?: string | null;
}

interface ProfileCanvasProps {
  template: ProfileTemplateId;
  linkCardStyle: LinkCardStyleId;
  socialLinkStyle: SocialLinkStyleId;
  name: string;
  username: string;
  bio?: string;
  avatarUrl?: string | null;
  avatarFallback: string;
  cardColor: string;
  socialLinks?: ProfileSocialLink[];
  onlineCounter?: ReactNode;
  links: ProfileCanvasLink[];
  plan?: string;
  preview?: boolean;
}

function getContentPadding(template: ProfileTemplateId, preview: boolean): string {
  if (template === "cutout") {
    return `px-4 min-[380px]:px-6 ${preview ? "" : "sm:px-8"}`;
  }
  return `px-4 min-[380px]:px-5 ${preview ? "" : "sm:px-6"}`;
}

function getLinkSpacing(
  template: ProfileTemplateId,
  cardStyle: LinkCardStyleId,
): string {
  if (cardStyle === "minimal") return "space-y-0";
  if (template === "compact") return "space-y-2.5";
  if (template === "cutout") return "space-y-3.5";
  return "space-y-3";
}

export function ProfileCanvas({
  template,
  linkCardStyle,
  socialLinkStyle,
  name,
  username,
  bio,
  avatarUrl,
  avatarFallback,
  cardColor,
  socialLinks = [],
  onlineCounter,
  links,
  plan = "creator",
  preview = false,
}: ProfileCanvasProps) {
  const lightCard = isLightProfileColor(cardColor);
  const interactiveClass = preview ? "pointer-events-none select-none" : "";

  return (
    <main
      className={`relative flex w-full max-w-[528px] flex-col overflow-hidden ${
        preview
          ? "min-h-[812px] border-0 shadow-none"
          : `min-h-[100dvh] border shadow-[0_28px_90px_rgba(0,0,0,0.58)] animate-fade-in sm:my-[1vh] sm:min-h-[98vh] sm:rounded-[1.5rem] ${
              lightCard ? "border-black/10" : "border-white/[0.08]"
            }`
      } ${interactiveClass}`}
      style={{ backgroundColor: cardColor }}
      data-profile-template={template}
      data-link-card-style={linkCardStyle}
      data-social-link-style={socialLinkStyle}
      data-profile-preview={preview ? "true" : "false"}
    >
      <ProfileIdentity
        template={template}
        name={name}
        username={username}
        bio={bio}
        avatarUrl={avatarUrl}
        avatarFallback={avatarFallback}
        cardColor={cardColor}
        socialLinks={socialLinks}
        socialStyle={socialLinkStyle}
        onlineCounter={onlineCounter}
        preview={preview}
      />

      <div
        data-card-theme-content="true"
        className={`relative -mt-[2px] flex flex-1 flex-col pb-10 pt-[2px] ${getContentPadding(template, preview)}`}
        style={{ backgroundColor: cardColor }}
      >
        <div data-tracking-active="true" className="hidden" />

        <div className={`mt-5 min-[380px]:mt-6 ${getLinkSpacing(template, linkCardStyle)}`}>
          {links.length === 0 ? (
            <div className={`border-y py-10 text-center ${lightCard ? "border-black/10" : "border-white/10"}`}>
              <Globe
                className={`mx-auto mb-3 h-8 w-8 ${lightCard ? "text-black/25" : "text-white/25"}`}
                strokeWidth={1.5}
              />
              <p className={`text-sm font-medium ${lightCard ? "text-black/45" : "text-white/45"}`}>
                No public links yet
              </p>
            </div>
          ) : (
            links.map((link) => (
              <ProfileLinkCard
                key={link.id}
                title={link.title}
                href={link.href}
                destinationUrl={link.destinationUrl}
                iconType={link.iconType}
                iconValue={link.iconValue}
                size={link.size}
                backgroundUrl={link.backgroundUrl}
                template={template}
                cardColor={cardColor}
                cardStyle={linkCardStyle}
                preview={preview}
              />
            ))
          )}
        </div>

        <div className="mt-auto flex flex-grow flex-col items-center justify-end gap-5 pb-6 pt-12 min-[380px]:pt-14">
          {!checkPlan(plan, "remove_branding") && (
            <div className="mt-auto text-center">
              <a
                href="/"
                tabIndex={preview ? -1 : undefined}
                className={`group inline-flex items-center gap-1.5 text-[10px] transition-colors ${
                  lightCard ? "text-black/40 hover:text-black" : "text-white/38 hover:text-white"
                }`}
              >
                <span className="font-medium uppercase tracking-widest">Powered by</span>
                <span className="flex items-center gap-1 font-black">
                  <img
                    src="/logo.webp"
                    alt="Linktery"
                    className={`h-6 w-auto opacity-80 transition-opacity group-hover:opacity-100 ${
                      lightCard ? "invert" : "grayscale mix-blend-screen"
                    }`}
                  />
                  <span className={`text-[11px] uppercase tracking-tighter ${lightCard ? "text-black/70" : "text-white/80"}`}>
                    Linktery
                  </span>
                </span>
              </a>
            </div>
          )}

          <div className={`relative flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest ${lightCard ? "text-black/25" : "text-white/25"}`}>
            <a
              href="/privacy"
              tabIndex={preview ? -1 : undefined}
              className={`transition-colors ${lightCard ? "hover:text-black/60" : "hover:text-white/60"}`}
            >
              Privacy Policy
            </a>
            <span aria-hidden="true">|</span>
            <a
              href="/terms"
              tabIndex={preview ? -1 : undefined}
              className={`transition-colors ${lightCard ? "hover:text-black/60" : "hover:text-white/60"}`}
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
