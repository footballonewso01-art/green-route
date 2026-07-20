import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Link2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  normalizeProfileTemplate,
  PROFILE_TEMPLATES,
} from "@/lib/profileTemplates";

export interface ProfileLibraryCardData {
  id: string;
  slug: string;
  name?: string;
  profileTemplate?: string;
  cardColor?: string;
  avatarUrl?: string | null;
  onlineCounter?: boolean;
  linkCount: number;
  fullUrl: string;
}

interface ProfileLibraryCardProps {
  profile: ProfileLibraryCardData;
  copied?: boolean;
  deleteDisabled?: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export function ProfileLibraryCard({
  profile,
  copied = false,
  deleteDisabled = false,
  onEdit,
  onCopy,
  onDelete,
}: ProfileLibraryCardProps) {
  const template = normalizeProfileTemplate(profile.profileTemplate);
  const templateName = PROFILE_TEMPLATES.find((item) => item.id === template)?.name || "Classic Cover";
  const name = profile.name?.trim() || profile.slug;
  const cardColor = /^#[0-9a-fA-F]{6}$/.test(profile.cardColor || "") ? profile.cardColor! : "#101311";
  const displayUrl = profile.fullUrl.replace(/^https?:\/\//, "");
  const fallback = (name[0] || "?").toUpperCase();

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-border/70 bg-surface/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_38px_rgba(0,0,0,0.16)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_48px_rgba(0,0,0,0.24)] motion-reduce:transform-none motion-reduce:transition-none">
      <button
        type="button"
        onClick={onEdit}
        className="absolute inset-0 z-10 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        aria-label={`Edit ${name} profile`}
      />

      <div
        className="relative h-[104px] border-b border-border/50"
        style={{ backgroundColor: cardColor }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {profile.avatarUrl && (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-full w-full scale-110 object-cover object-center opacity-30 blur-xl"
            />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_115%,rgba(255,255,255,0.2),transparent_42%),linear-gradient(110deg,rgba(0,0,0,0.08),rgba(0,0,0,0.42))]" />
        </div>

        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-white/80 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Public
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/45 text-white/75 backdrop-blur-md transition-colors hover:bg-black/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`More actions for ${name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="z-[120] w-52 rounded-xl border-border/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            <DropdownMenuItem asChild className="rounded-lg px-3 py-2.5 focus:bg-white/[0.06] focus:text-foreground">
              <a href={profile.fullUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2.5 h-4 w-4 text-muted-foreground" />
                Open public profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onCopy}
              className="rounded-lg px-3 py-2.5 focus:bg-white/[0.06] focus:text-foreground"
            >
              {copied ? (
                <Check className="mr-2.5 h-4 w-4 text-accent" />
              ) : (
                <Copy className="mr-2.5 h-4 w-4 text-muted-foreground" />
              )}
              {copied ? "URL copied" : "Copy profile URL"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-border/70" />
            <DropdownMenuItem
              onSelect={onDelete}
              disabled={deleteDisabled}
              className="rounded-lg px-3 py-2.5 text-red-400 focus:bg-red-500/10 focus:text-red-300"
            >
              <Trash2 className="mr-2.5 h-4 w-4" />
              Delete profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="pointer-events-none absolute bottom-3 right-3 max-w-[56%] truncate rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white/75 backdrop-blur-md">
          {templateName}
        </span>

        <span className="absolute -bottom-6 left-4 z-[1] flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-surface bg-surface text-lg font-black text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            fallback
          )}
        </span>
      </div>

      <div className="pointer-events-none px-4 pb-4 pt-9">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold tracking-[-0.025em] text-foreground">{name}</h2>
          <p className="mt-1 truncate font-sans text-[12px] text-muted-foreground">{displayUrl}</p>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            {profile.linkCount} {profile.linkCount === 1 ? "link" : "links"}
          </span>
          {profile.onlineCounter && (
            <span className="inline-flex items-center gap-1.5 text-accent/80">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Counter on
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-accent">
            Edit profile
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>

          <div className="pointer-events-auto relative z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCopy}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-border/70 bg-background/35 text-muted-foreground transition-colors hover:border-accent/25 hover:bg-accent/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={copied ? `${name} profile URL copied` : `Copy ${name} profile URL`}
              title="Copy profile URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={profile.fullUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-border/70 bg-background/35 text-muted-foreground transition-colors hover:border-accent/25 hover:bg-accent/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Open ${name} public profile`}
              title="Open public profile"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
