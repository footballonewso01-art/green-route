import { ReactNode } from "react";
import { IconRenderer } from "@/components/icons/IconRenderer";
import { getPresetIcon } from "@/components/icons/presets";
import {
  isLightProfileColor,
  ProfileTemplateId,
} from "@/lib/profileTemplates";
import { SocialLinkStyleId } from "@/lib/profileAppearance";

export interface ProfileSocialLink {
  id: string;
  url: string;
  icon_type: "preset" | "emoji" | "custom" | "none" | string;
  icon_value: string;
  label?: string;
}

interface ProfileIdentityProps {
  template: ProfileTemplateId;
  name: string;
  username: string;
  bio?: string;
  avatarUrl?: string | null;
  avatarFallback: string;
  cardColor: string;
  socialLinks?: ProfileSocialLink[];
  socialStyle?: SocialLinkStyleId;
  onlineCounter?: ReactNode;
  preview?: boolean;
}

function Avatar({
  avatarUrl,
  fallback,
  alt,
  className,
  imageClassName = "object-cover object-top",
}: {
  avatarUrl?: string | null;
  fallback: string;
  alt: string;
  className: string;
  imageClassName?: string;
}) {
  return (
    <div className={`overflow-hidden bg-white/10 flex items-center justify-center ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={alt}
          className={`w-full h-full ${imageClassName}`}
        />
      ) : (
        <span className="text-4xl font-black bg-gradient-to-br from-white to-white/30 bg-clip-text text-transparent">
          {fallback}
        </span>
      )}
    </div>
  );
}

function CardThemeFade({
  cardColor,
  className,
  solidFrom = 72,
}: {
  cardColor: string;
  className: string;
  solidFrom?: number;
}) {
  return (
    <div
      aria-hidden="true"
      data-card-theme-transition="true"
      className={`pointer-events-none ${className}`}
      style={{
        background: `linear-gradient(to bottom, transparent 0%, ${cardColor} ${solidFrom}%, ${cardColor} 100%)`,
      }}
    >
      <span
        data-card-theme-seam-guard="true"
        className="absolute inset-x-0 -bottom-[3px] h-[8px]"
        style={{ backgroundColor: cardColor }}
      />
    </div>
  );
}

function getSocialLabel(social: ProfileSocialLink): string {
  if (social.label?.trim()) return social.label.trim();

  if (social.icon_type === "preset") {
    const preset = getPresetIcon(social.icon_value);
    if (preset) return preset.name;
  }

  try {
    return new URL(social.url).hostname.replace(/^www\./, "");
  } catch {
    return "Social profile";
  }
}

function isValidSocialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const SOCIAL_HOVER_COLORS: Record<string, string> = {
  instagram: "hover:text-[#E1306C]",
  tiktok: "hover:text-[#25F4EE]",
  twitter: "hover:text-current",
  youtube: "hover:text-[#FF0033]",
  telegram: "hover:text-[#2AABEE]",
  whatsapp: "hover:text-[#25D366]",
  spotify: "hover:text-[#1ED760]",
  github: "hover:text-current",
  linkedin: "hover:text-[#0A66C2]",
};

const SOCIAL_BRAND_SURFACES: Record<string, string> = {
  instagram: "bg-[#D92D78] text-white hover:bg-[#C5266D]",
  tiktok: "bg-[#161616] text-white hover:bg-black",
  twitter: "bg-[#151515] text-white hover:bg-black",
  youtube: "bg-[#E91B23] text-white hover:bg-[#D2151D]",
  telegram: "bg-[#278CC4] text-white hover:bg-[#217CAD]",
  whatsapp: "bg-[#1F9E54] text-white hover:bg-[#1B8A49]",
  spotify: "bg-[#178A45] text-white hover:bg-[#147A3D]",
  github: "bg-[#24292F] text-white hover:bg-[#171B1F]",
  linkedin: "bg-[#1769A7] text-white hover:bg-[#135B91]",
};

function SocialDock({
  links,
  light,
  preview,
  align = "center",
  style,
}: {
  links: ProfileSocialLink[];
  light: boolean;
  preview: boolean;
  align?: "center" | "left";
  style: SocialLinkStyleId;
}) {
  const visibleLinks = links.filter((social) => isValidSocialUrl(social.url));
  if (visibleLinks.length === 0) return null;

  const wrapperClass = `flex flex-wrap items-center gap-2 ${align === "left" ? "justify-start" : "justify-center"}`;

  return (
    <div className={wrapperClass}>
      {visibleLinks.map((social) => {
        const label = getSocialLabel(social);
        const iconHoverColor = social.icon_type === "preset"
          ? SOCIAL_HOVER_COLORS[social.icon_value] || ""
          : "";
        const brandSurface = social.icon_type === "preset"
          ? SOCIAL_BRAND_SURFACES[social.icon_value] || ""
          : "";

        const itemClass = style === "icons"
          ? `flex h-11 w-11 items-center justify-center rounded-full transition-[color,background-color,transform] duration-200 ${
              light
                ? "text-black/[0.72] hover:bg-black/[0.06]"
                : "text-white/[0.84] hover:bg-white/[0.075]"
            } ${iconHoverColor} active:scale-[0.94] motion-reduce:transform-none motion-reduce:transition-none`
          : style === "branded-pills"
            ? `flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-[12px] font-bold transition-[background-color,border-color,transform] duration-200 ${
                brandSurface || (light
                  ? "border-black/[0.08] bg-black/[0.09] text-black hover:bg-black/[0.14]"
                  : "border-white/[0.09] bg-white/[0.11] text-white hover:bg-white/[0.16]")
              } ${brandSurface ? "border-white/[0.12]" : ""} active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none`
          : `flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-[12px] font-bold transition-[background-color,border-color,transform] duration-200 ${
                brandSurface || (light
                  ? "border-black/[0.08] bg-black/[0.09] text-black hover:bg-black/[0.14]"
                  : "border-white/[0.09] bg-white/[0.11] text-white hover:bg-white/[0.16]")
              } ${brandSurface ? "border-white/[0.12]" : ""} active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none`;

        const content = (
          <>
            <span className={`flex shrink-0 items-center justify-center ${style === "icons" ? "h-6 w-6" : "h-5 w-5"}`}>
              <IconRenderer
                type={social.icon_type}
                value={social.icon_value}
                className="h-full w-full"
              />
            </span>
            {style !== "icons" && <span className="min-w-0 truncate">{label}</span>}
          </>
        );

        if (preview) {
          return (
            <span key={social.id} className={itemClass} title={label}>
              {content}
            </span>
          );
        }

        return (
          <a
            key={social.id}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${label}`}
            title={label}
            className={`${itemClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 ${light ? "focus-visible:ring-offset-white" : "focus-visible:ring-offset-black"}`}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}

export function ProfileIdentity({
  template,
  name,
  username,
  bio,
  avatarUrl,
  avatarFallback,
  cardColor,
  socialLinks = [],
  socialStyle = "icons",
  onlineCounter,
  preview = false,
}: ProfileIdentityProps) {
  const light = isLightProfileColor(cardColor);
  const primaryText = light ? "text-black" : "text-white";
  const secondaryText = light ? "text-black/55" : "text-white/55";
  const bioText = light ? "text-black/80" : "text-white/90";
  const identityText = (alignment: "center" | "left" = "center", hero = false) => (
    <div className={alignment === "left" ? "text-left" : "text-center"}>
      <h1
        className={`break-words ${
          hero
            ? `font-sans text-4xl font-black leading-[0.94] tracking-[-0.045em] ${preview ? "" : "sm:text-5xl"}`
            : template === "compact"
              ? "font-geist text-[28px] font-bold leading-tight tracking-[-0.035em]"
              : template === "banner"
                ? "font-geist text-3xl font-extrabold leading-tight tracking-[-0.035em]"
                : template === "cutout"
                  ? `font-serif text-4xl font-bold leading-[0.94] tracking-[-0.045em] min-[380px]:text-5xl ${preview ? "" : "sm:text-6xl"}`
                  : "font-sans text-3xl font-extrabold leading-tight tracking-[-0.035em]"
        } ${primaryText} ${hero ? "drop-shadow-[0_3px_20px_rgba(0,0,0,0.7)]" : ""}`}
      >
        {name}
      </h1>
      <p className={`mt-1.5 break-all text-sm font-medium tracking-wide ${secondaryText} ${template === "compact" || template === "banner" ? "font-geist" : "font-sans"}`}>
        @{username}
      </p>
    </div>
  );

  const biography = (alignment: "center" | "left" = "center") =>
    bio ? (
      <p
        className={`text-sm leading-relaxed whitespace-pre-line line-clamp-3 ${bioText} ${
          alignment === "left" ? "text-left max-w-sm" : "text-center max-w-[300px] mx-auto"
        }`}
      >
        {bio}
      </p>
    ) : null;

  if (template === "compact") {
    return (
      <section className={`px-4 pb-2 pt-10 min-[380px]:px-6 min-[380px]:pt-14 ${preview ? "" : "sm:pt-16"}`}>
        <Avatar
          avatarUrl={avatarUrl}
          fallback={avatarFallback}
          alt={`${name} profile image`}
          className={`mx-auto h-24 w-24 rounded-full border-4 shadow-2xl min-[380px]:h-28 min-[380px]:w-28 ${light ? "border-black/10" : "border-white/10"}`}
        />
        <div className="mt-5">{identityText()}</div>
        <div className="mt-4">
          <SocialDock links={socialLinks} light={light} preview={preview} style={socialStyle} />
        </div>
        {bio && <div className="mt-4">{biography()}</div>}
        {onlineCounter}
      </section>
    );
  }

  if (template === "banner") {
    return (
      <section className="relative pb-2" style={{ backgroundColor: cardColor }}>
        <div
          className={`relative h-36 overflow-hidden min-[380px]:h-44 ${preview ? "" : "sm:h-48"}`}
          style={{ backgroundColor: cardColor }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover object-center scale-110 blur-[2px] opacity-75"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
          )}
        </div>
        <CardThemeFade
          cardColor={cardColor}
          className={`absolute inset-x-0 top-0 z-[1] h-48 min-[380px]:h-56 ${
            preview ? "" : "sm:h-60"
          }`}
        />
        <div className="relative z-10 -mt-12 px-4 min-[380px]:-mt-14 min-[380px]:px-6">
          <Avatar
            avatarUrl={avatarUrl}
            fallback={avatarFallback}
            alt={`${name} profile image`}
            className="mx-auto h-24 w-24 rounded-full border-4 shadow-2xl min-[380px]:h-28 min-[380px]:w-28"
          />
          <div className="mt-4">{identityText()}</div>
          <div className="mt-3">
            <SocialDock links={socialLinks} light={light} preview={preview} style={socialStyle} />
          </div>
          {bio && <div className="mt-3">{biography()}</div>}
          {onlineCounter}
        </div>
      </section>
    );
  }

  if (template === "hero") {
    return (
      <section className="relative aspect-[4/5] max-h-[680px] w-full overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${name} profile image`} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-black/40 flex items-center justify-center">
            <span className="text-8xl font-black text-white/30">{avatarFallback}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
        <div
          aria-hidden="true"
          data-card-theme-seam-guard="true"
          className="absolute inset-x-0 bottom-0 h-[3px]"
          style={{ backgroundColor: cardColor }}
        />
        <div className={`absolute inset-x-0 bottom-0 p-5 pb-6 min-[380px]:p-6 min-[380px]:pb-8 ${preview ? "" : "sm:p-8"}`}>
          <div className="[&_*]:!text-white">{identityText("left", true)}</div>
          {bio && <div className="mt-3 [&_*]:!text-white/[0.85]">{biography("left")}</div>}
          <div className="mt-4 [&_*]:!text-white">
            <SocialDock links={socialLinks} light={false} preview={preview} align="left" style={socialStyle} />
          </div>
          {onlineCounter}
        </div>
      </section>
    );
  }

  if (template === "cutout") {
    return (
      <section className={`overflow-hidden px-4 pb-3 pt-9 min-[380px]:px-6 min-[380px]:pt-11 ${preview ? "" : "sm:px-8 sm:pt-12"}`}>
        <div className="relative">
          <div className={`absolute right-0 top-0 h-44 w-36 rotate-6 rounded-[45%_45%_20%_20%] bg-gradient-to-br from-white/20 to-transparent min-[380px]:h-56 min-[380px]:w-44 ${preview ? "" : "sm:h-60 sm:w-48"}`} />
          <Avatar
            avatarUrl={avatarUrl}
            fallback={avatarFallback}
            alt={`${name} profile image`}
            className={`relative ml-auto mr-0 h-44 w-36 rounded-[45%_45%_20%_20%] border shadow-2xl min-[380px]:mr-2 min-[380px]:h-56 min-[380px]:w-44 ${preview ? "" : "sm:h-60 sm:w-48"} ${light ? "border-black/10" : "border-white/15"}`}
          />
          <div className="relative z-10 -mt-3 max-w-full min-[380px]:-mt-4 min-[380px]:max-w-[90%]">
            {identityText("left")}
          </div>
        </div>
        {bio && <div className="mt-5">{biography("left")}</div>}
        <div className="mt-5">
          <SocialDock links={socialLinks} light={light} preview={preview} align="left" style={socialStyle} />
        </div>
        {onlineCounter}
      </section>
    );
  }

  return (
    <section style={{ backgroundColor: cardColor }}>
      <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${name} profile image`} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-6xl font-bold bg-gradient-to-br from-white to-white/30 bg-clip-text text-transparent">
              {avatarFallback}
            </span>
          </div>
        )}
        <CardThemeFade
          cardColor={cardColor}
          solidFrom={90}
          className="absolute inset-x-0 bottom-0 h-[54%]"
        />
      </div>
      <div
        aria-hidden="true"
        data-card-theme-seam-guard="true"
        className="relative -mt-[2px] h-[3px]"
        style={{ backgroundColor: cardColor }}
      />
      <div className="relative -mt-12 px-4 min-[380px]:-mt-16 min-[380px]:px-6">
        {identityText()}
        <div className="mt-3">
          <SocialDock links={socialLinks} light={light} preview={preview} style={socialStyle} />
        </div>
        {bio && <div className="mt-3">{biography()}</div>}
        {onlineCounter}
      </div>
    </section>
  );
}
