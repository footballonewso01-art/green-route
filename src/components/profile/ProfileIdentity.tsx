import { ReactNode } from "react";
import { IconRenderer } from "@/components/icons/IconRenderer";
import {
  isLightProfileColor,
  ProfileTemplateId,
} from "@/lib/profileTemplates";

export interface ProfileSocialLink {
  id: string;
  url: string;
  icon_type: "preset" | "emoji" | "custom" | "none" | string;
  icon_value: string;
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
  onlineCounter?: ReactNode;
  preview?: boolean;
}

function Avatar({
  avatarUrl,
  fallback,
  className,
  imageClassName = "object-cover object-top",
}: {
  avatarUrl?: string | null;
  fallback: string;
  className: string;
  imageClassName?: string;
}) {
  return (
    <div className={`overflow-hidden bg-white/10 flex items-center justify-center ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
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

function SocialRow({
  links,
  light,
  preview,
  align = "center",
  compact = false,
}: {
  links: ProfileSocialLink[];
  light: boolean;
  preview: boolean;
  align?: "center" | "left";
  compact?: boolean;
}) {
  if (links.length === 0) return null;

  const wrapperClass = `flex items-center ${align === "left" ? "justify-start" : "justify-center"} ${compact ? "gap-1.5" : "gap-3"} flex-wrap`;
  const itemClass = `${compact ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl"} border flex items-center justify-center transition-all duration-300 shadow-lg ${
    light
      ? "bg-black/5 border-black/10 hover:bg-black/10"
      : "bg-white/5 border-white/10 hover:bg-white/10"
  }`;
  const iconClass = `${compact ? "w-4 h-4" : "w-5 h-5"} ${light ? "text-black/75" : "text-white/80"}`;

  return (
    <div className={wrapperClass}>
      {links.map((social) => {
        const content = (
          <IconRenderer
            type={social.icon_type}
            value={social.icon_value}
            className={iconClass}
          />
        );

        if (preview) {
          return (
            <span key={social.id} className={itemClass}>
              {content}
            </span>
          );
        }

        const safeUrl = /^https?:\/\//i.test(social.url) ? social.url : "#";
        return (
          <a
            key={social.id}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${itemClass} hover:scale-105`}
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
  onlineCounter,
  preview = false,
}: ProfileIdentityProps) {
  const light = isLightProfileColor(cardColor);
  const primaryText = light ? "text-black" : "text-white";
  const secondaryText = light ? "text-black/55" : "text-white/55";
  const bioText = light ? "text-black/80" : "text-white/90";
  const scale = preview ? 0.78 : 1;

  const identityText = (alignment: "center" | "left" = "center", hero = false) => (
    <div className={alignment === "left" ? "text-left" : "text-center"}>
      <h1
        className={`${hero ? (preview ? "text-4xl" : "text-3xl min-[380px]:text-4xl sm:text-5xl") : preview ? "text-2xl" : "text-2xl min-[360px]:text-3xl"} font-black tracking-tight break-words ${primaryText} ${hero ? "drop-shadow-[0_3px_20px_rgba(0,0,0,0.7)]" : ""}`}
      >
        {name}
      </h1>
      <p className={`mt-1 text-sm font-medium tracking-wide break-all ${secondaryText}`}>
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
      <section className={`${preview ? "pt-10 px-4" : "pt-10 min-[380px]:pt-14 sm:pt-16 px-4 min-[380px]:px-6"} pb-2`}>
        <Avatar
          avatarUrl={avatarUrl}
          fallback={avatarFallback}
          className={`${preview ? "w-[76px] h-[76px]" : "w-24 h-24 min-[380px]:w-28 min-[380px]:h-28"} mx-auto rounded-full border-4 ${light ? "border-black/10" : "border-white/10"} shadow-2xl`}
        />
        <div className={`${preview ? "mt-3" : "mt-5"}`}>{identityText()}</div>
        <div className={`${preview ? "mt-2" : "mt-4"}`}>
          <SocialRow links={socialLinks} light={light} preview={preview} compact={preview} />
        </div>
        {bio && <div className={`${preview ? "mt-2" : "mt-4"}`}>{biography()}</div>}
        {onlineCounter}
      </section>
    );
  }

  if (template === "banner") {
    return (
      <section className="relative pb-2">
        <div className={`${preview ? "h-28" : "h-36 min-[380px]:h-44 sm:h-48"} relative overflow-hidden`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover object-center scale-110 blur-[2px] opacity-75"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/20 via-white/5 to-transparent" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, transparent 20%, ${cardColor})` }}
          />
        </div>
        <div className={`${preview ? "-mt-10 px-4" : "-mt-12 min-[380px]:-mt-14 px-4 min-[380px]:px-6"} relative`}>
          <Avatar
            avatarUrl={avatarUrl}
            fallback={avatarFallback}
            className={`${preview ? "w-20 h-20" : "w-24 h-24 min-[380px]:w-28 min-[380px]:h-28"} mx-auto rounded-full border-4 shadow-2xl`}
          />
          <div className={`${preview ? "mt-2" : "mt-4"}`}>{identityText()}</div>
          <div className={`${preview ? "mt-2" : "mt-3"}`}>
            <SocialRow links={socialLinks} light={light} preview={preview} compact={preview} />
          </div>
          {bio && <div className={`${preview ? "mt-2" : "mt-3"}`}>{biography()}</div>}
          {onlineCounter}
        </div>
      </section>
    );
  }

  if (template === "hero") {
    return (
      <section className={`relative w-full overflow-hidden ${preview ? "aspect-[4/5]" : "aspect-[4/5] max-h-[680px]"}`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-black/40 flex items-center justify-center">
            <span className="text-8xl font-black text-white/30">{avatarFallback}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
        <div className={`${preview ? "p-4 pb-5" : "p-5 min-[380px]:p-6 sm:p-8 pb-6 min-[380px]:pb-8"} absolute inset-x-0 bottom-0`}>
          <div style={{ transform: preview ? `scale(${scale})` : undefined, transformOrigin: "bottom left" }}>
            <div className="[&_*]:!text-white">{identityText("left", true)}</div>
            {bio && <div className="mt-3 [&_*]:!text-white/85">{biography("left")}</div>}
            <div className="mt-4 [&_*]:!text-white">
              <SocialRow links={socialLinks} light={false} preview={preview} align="left" compact={preview} />
            </div>
            {onlineCounter}
          </div>
        </div>
      </section>
    );
  }

  if (template === "cutout") {
    return (
      <section className={`${preview ? "px-4 pt-9" : "px-4 min-[380px]:px-6 sm:px-8 pt-9 min-[380px]:pt-11 sm:pt-12"} pb-3 overflow-hidden`}>
        <div className="relative">
          <div className={`absolute ${preview ? "w-28 h-36 right-2 top-0" : "w-36 h-44 min-[380px]:w-44 min-[380px]:h-56 sm:w-48 sm:h-60 right-0 top-0"} rounded-[45%_45%_20%_20%] bg-gradient-to-br from-white/20 to-transparent rotate-6`} />
          <Avatar
            avatarUrl={avatarUrl}
            fallback={avatarFallback}
            className={`${preview ? "w-28 h-36" : "w-36 h-44 min-[380px]:w-44 min-[380px]:h-56 sm:w-48 sm:h-60"} ml-auto mr-0 min-[380px]:mr-2 rounded-[45%_45%_20%_20%] relative shadow-2xl border ${light ? "border-black/10" : "border-white/15"}`}
          />
          <div className={`${preview ? "-mt-5 max-w-[90%]" : "-mt-5 min-[380px]:-mt-8 max-w-full min-[380px]:max-w-[90%]"} relative z-10`}>
            <div className={preview ? "[&_h1]:!text-3xl" : "[&_h1]:!text-4xl min-[380px]:[&_h1]:!text-5xl sm:[&_h1]:!text-6xl [&_h1]:leading-[0.92]"}>
              {identityText("left")}
            </div>
          </div>
        </div>
        {bio && <div className={`${preview ? "mt-3" : "mt-5"}`}>{biography("left")}</div>}
        <div className={`${preview ? "mt-3" : "mt-5"}`}>
          <SocialRow links={socialLinks} light={light} preview={preview} align="left" compact={preview} />
        </div>
        {onlineCounter}
      </section>
    );
  }

  return (
    <section>
      <div className={`relative ${preview ? "aspect-[10/8]" : "aspect-[10/7]"} w-full overflow-hidden shrink-0`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-6xl font-bold bg-gradient-to-br from-white to-white/30 bg-clip-text text-transparent">
              {avatarFallback}
            </span>
          </div>
        )}
        <div
          className="absolute -bottom-1 left-0 w-full h-[45%] pointer-events-none"
          style={{ background: `linear-gradient(to top, ${cardColor} 15%, transparent)` }}
        />
      </div>
      <div className={`${preview ? "px-4 -mt-14" : "px-4 min-[380px]:px-6 -mt-12 min-[380px]:-mt-16"} relative`}>
        {identityText()}
        <div className={`${preview ? "mt-2" : "mt-3"}`}>
          <SocialRow links={socialLinks} light={light} preview={preview} compact={preview} />
        </div>
        {bio && <div className={`${preview ? "mt-2" : "mt-3"}`}>{biography()}</div>}
        {onlineCounter}
      </div>
    </section>
  );
}
