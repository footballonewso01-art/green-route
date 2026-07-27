import { ArrowUpRight } from "lucide-react";
import { IconRenderer } from "@/components/icons/IconRenderer";
import {
  isLightProfileColor,
  ProfileTemplateId,
} from "@/lib/profileTemplates";
import { LinkCardStyleId } from "@/lib/profileAppearance";

interface ProfileLinkCardProps {
  title: string;
  destinationUrl?: string;
  href?: string;
  iconType?: string;
  iconValue?: string;
  size?: "regular" | "large";
  backgroundUrl?: string | null;
  template: ProfileTemplateId;
  cardColor: string;
  cardStyle?: LinkCardStyleId;
  preview?: boolean;
}

function getRadiusClass(template: ProfileTemplateId): string {
  if (template === "compact") return "rounded-[14px]";
  if (template === "cutout") return "rounded-[9px]";
  if (template === "banner") return "rounded-[20px]";
  if (template === "hero") return "rounded-[16px]";
  return "rounded-[18px]";
}

function getTitleClass(template: ProfileTemplateId): string {
  if (template === "compact") return "font-geist font-semibold tracking-[-0.02em]";
  if (template === "banner") return "font-geist font-bold tracking-[-0.025em]";
  if (template === "hero") return "font-sans font-extrabold tracking-[-0.025em]";
  if (template === "cutout") return "font-serif font-bold tracking-[-0.025em]";
  return "font-sans font-semibold tracking-[-0.015em]";
}

function getSurfaceClass(
  light: boolean,
  style: LinkCardStyleId,
): string {
  if (style === "solid") {
    return light
      ? "border-black/[0.04] bg-black/[0.105] shadow-[0_10px_24px_rgba(0,0,0,0.08)] hover:bg-black/[0.14]"
      : "border-white/[0.035] bg-white/[0.13] shadow-[0_12px_26px_rgba(0,0,0,0.18)] hover:bg-white/[0.17]";
  }

  if (style === "outline") {
    return light
      ? "border-black/[0.24] bg-transparent hover:bg-black/[0.045]"
      : "border-white/[0.26] bg-transparent hover:bg-white/[0.055]";
  }

  if (style === "image-first") {
    return light
      ? "border-black/[0.07] bg-black/[0.07] hover:bg-black/[0.105]"
      : "border-white/[0.07] bg-white/[0.085] hover:bg-white/[0.12]";
  }

  return light
    ? "border-black/[0.09] bg-black/[0.065] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl hover:bg-black/[0.095]"
    : "border-white/[0.11] bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl hover:bg-white/[0.11]";
}

export function ProfileLinkCard({
  title,
  destinationUrl,
  href,
  iconType,
  iconValue,
  size = "regular",
  backgroundUrl,
  template,
  cardColor,
  cardStyle = "glass",
  preview = false,
}: ProfileLinkCardProps) {
  const light = isLightProfileColor(cardColor);
  const featured = size === "large";
  const minimal = cardStyle === "minimal" && !featured;
  const imageFirst = cardStyle === "image-first" && Boolean(backgroundUrl) && !featured;
  const fullBackground = Boolean(backgroundUrl) && !imageFirst;
  const customIcon = iconType === "custom" && Boolean(iconValue);
  const textClass = fullBackground ? "text-white" : light ? "text-black" : "text-white";
  const radiusClass = getRadiusClass(template);
  const titleClass = getTitleClass(template);

  const cardClass = minimal
    ? `group relative flex min-h-[58px] w-full items-center overflow-hidden border-b px-1 transition-[background-color,transform] duration-200 ${
        light
          ? "border-black/[0.16] hover:bg-black/[0.035]"
          : "border-white/[0.16] hover:bg-white/[0.04]"
      } active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none`
    : `group relative isolate flex w-full overflow-hidden border ${radiusClass} ${getSurfaceClass(light, cardStyle)} ${
        featured
          ? "min-h-[164px] aspect-[2/1]"
          : `${imageFirst ? "min-h-[76px] p-1.5" : "min-h-[62px] px-3.5"} items-center`
      } transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none`;

  const iconSurfaceClass = fullBackground
    ? "bg-black/28 text-white backdrop-blur-md"
    : cardStyle === "solid"
      ? light
        ? "bg-black/[0.085] text-black/[0.82]"
        : "bg-black/15 text-white"
      : light
        ? "bg-black/[0.06] text-black/[0.78]"
        : "bg-white/[0.075] text-white/[0.88]";

  const content = (
    <>
      {fullBackground && (
        <>
          <img
            src={backgroundUrl || undefined}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
          />
          <div
            className={`absolute inset-0 ${
              featured
                ? "bg-gradient-to-t from-black/92 via-black/38 to-black/10"
                : "bg-black/58"
            }`}
          />
        </>
      )}

      <div
        className={`relative flex w-full ${
          featured
            ? "h-full flex-col justify-between p-5"
            : "items-center"
        }`}
      >
        {imageFirst ? (
          <span className={`h-[64px] w-[76px] shrink-0 overflow-hidden ${radiusClass}`}>
            <img
              src={backgroundUrl || undefined}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
            />
          </span>
        ) : (
          <span
            className={`flex shrink-0 items-center justify-center overflow-hidden ${
              featured
                ? "h-12 w-12 rounded-[14px]"
                : minimal
                  ? "h-10 w-10 rounded-[11px]"
                  : "h-10 w-10 rounded-[11px]"
            } ${iconSurfaceClass}`}
          >
            {customIcon ? (
              <IconRenderer
                type={iconType}
                value={iconValue}
                url={destinationUrl}
                className="h-full w-full"
              />
            ) : (
              <span className={`flex items-center justify-center ${featured ? "h-7 w-7" : "h-[22px] w-[22px]"}`}>
                <IconRenderer
                  type={iconType}
                  value={iconValue}
                  url={destinationUrl}
                  className="h-full w-full"
                />
              </span>
            )}
          </span>
        )}

        <span
          className={`min-w-0 ${
            featured
              ? "mt-auto pr-9"
              : `${imageFirst ? "ml-3.5" : "ml-3"} flex-1 pr-3`
          }`}
        >
          <span
            className={`block ${titleClass} ${textClass} ${
              featured
                ? "line-clamp-2 text-[22px] leading-[1.15]"
                : imageFirst
                  ? "truncate text-[15px] leading-tight"
                  : "truncate text-[15px] leading-tight"
            }`}
          >
            {title}
          </span>
        </span>

        <span
          className={`absolute flex items-center justify-center ${
            featured
              ? "right-4 top-4 h-8 w-8"
              : "right-1.5 top-1/2 h-9 w-9 -translate-y-1/2"
          } ${textClass} opacity-[0.5] transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-95 motion-reduce:transform-none motion-reduce:transition-none`}
          aria-hidden="true"
        >
          <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
      </div>
    </>
  );

  if (!href || preview) {
    return (
      <div className={cardClass} aria-hidden={preview || undefined}>
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title}, opens in a new tab`}
      className={`${cardClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
    >
      {content}
    </a>
  );
}
