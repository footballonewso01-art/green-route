import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Gauge,
  Globe2,
  Layers,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { pb } from "@/lib/pocketbase";

type SlugAvailability = "idle" | "checking" | "available" | "taken" | "unknown";

interface CreateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: string[];
  domain: string;
  onDomainChange: (domain: string) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  currentProfiles: number;
  profileLimit: number;
  planName: string;
  loading?: boolean;
  onSubmit: () => void;
}

function normalizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function CreateProfileDialog({
  open,
  onOpenChange,
  domains,
  domain,
  onDomainChange,
  slug,
  onSlugChange,
  name,
  onNameChange,
  currentProfiles,
  profileLimit,
  planName,
  loading = false,
  onSubmit,
}: CreateProfileDialogProps) {
  const [availability, setAvailability] = useState<SlugAvailability>("idle");
  const normalizedSlug = useMemo(() => normalizeSlug(slug), [slug]);
  const displayUrl = `${domain}/${normalizedSlug || "your-profile"}`;

  useEffect(() => {
    if (!open || !normalizedSlug) {
      setAvailability("idle");
      return;
    }

    let active = true;
    setAvailability("checking");

    const timeout = window.setTimeout(async () => {
      try {
        const [profileMatches, linkMatches] = await Promise.all([
          pb.collection("public_profiles").getList(1, 1, {
            filter: `slug = "${normalizedSlug}"`,
            fields: "id",
            requestKey: null,
          }),
          pb.collection("links").getList(1, 1, {
            filter: `slug = "${normalizedSlug}"`,
            fields: "id",
            requestKey: null,
          }),
        ]);

        if (active) {
          setAvailability(profileMatches.totalItems > 0 || linkMatches.totalItems > 0 ? "taken" : "available");
        }
      } catch {
        if (active) setAvailability("unknown");
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [normalizedSlug, open]);

  const submitDisabled = loading
    || !normalizedSlug
    || availability === "checking"
    || availability === "taken";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitDisabled) onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-[540px] overflow-y-auto rounded-[28px] border-border/80 bg-surface p-0 text-foreground shadow-[0_28px_100px_rgba(0,0,0,0.62)] [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-xl [&>button]:border [&>button]:border-border/70 [&>button]:bg-background/35 [&>button]:p-2 [&>button]:text-muted-foreground [&>button]:opacity-100 [&>button:hover]:bg-white/[0.06] [&>button:hover]:text-foreground">
        <form onSubmit={handleSubmit} className="min-w-0">
          <DialogHeader className="relative border-b border-border/60 px-6 pb-4 pt-5 pr-16 text-left sm:px-7 sm:pt-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[14px] border border-accent/20 bg-accent/10 text-accent">
              <Layers className="h-5 w-5" />
            </div>
            <DialogTitle className="text-[22px] font-bold tracking-[-0.03em] text-foreground">
              Create a Public Profile
            </DialogTitle>
            <DialogDescription className="max-w-md pt-1 text-sm leading-relaxed text-muted-foreground">
              Set up the public address now. You can choose a template and customize the page immediately after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5 sm:px-7">
            <div>
              <label htmlFor="new-profile-name" className="text-sm font-semibold text-foreground">
                Profile name
              </label>
              <p className="mb-2.5 mt-0.5 text-xs text-muted-foreground">
                Shown only on this Public Profile. It is separate from your Linktery account.
              </p>
              <input
                id="new-profile-name"
                type="text"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Creator name or brand"
                className="h-12 w-full rounded-2xl border border-border/80 bg-background/40 px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/60 focus:border-accent/45 focus:bg-background/55 focus:ring-2 focus:ring-accent/10"
              />
            </div>

            <div>
              <label htmlFor="new-profile-slug" className="text-sm font-semibold text-foreground">
                Public URL
              </label>
              <p className="mb-2.5 mt-0.5 text-xs text-muted-foreground">
                Choose the address you will share with your audience.
              </p>

              <div className="flex min-w-0 items-stretch rounded-2xl border border-border/80 bg-background/40 transition-[border-color,box-shadow,background-color] focus-within:border-accent/45 focus-within:bg-background/55 focus-within:ring-2 focus-within:ring-accent/10">
                <Select value={domain} onValueChange={onDomainChange}>
                  <SelectTrigger
                    aria-label="Profile domain"
                    className="h-12 w-[46%] min-w-0 rounded-l-2xl rounded-r-none border-0 border-r border-border/70 bg-transparent px-3.5 font-sans text-xs text-foreground shadow-none focus:ring-0 focus:ring-offset-0 sm:text-sm"
                  >
                    <div className="mr-2 flex min-w-0 items-center gap-2">
                      <Globe2 className="h-3.5 w-3.5 shrink-0 text-accent/80" />
                      <span className="truncate">{domain}</span>
                      <span className="hidden shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent sm:inline-flex">
                        {domains.indexOf(domain) === 0 ? "Primary" : "Alias"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[130] rounded-xl border-border/80 bg-popover/95 shadow-2xl backdrop-blur-xl">
                    {domains.map((domainOption, index) => (
                      <SelectItem
                        key={domainOption}
                        value={domainOption}
                        className="rounded-lg py-2.5 pl-8 pr-3 focus:bg-white/[0.06] focus:text-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span>{domainOption}</span>
                          <span className={`hidden rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:inline-flex ${index === 0 ? "bg-accent/10 text-accent" : "bg-white/5 text-muted-foreground"}`}>
                            {index === 0 ? "Primary" : "Alias"}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  id="new-profile-slug"
                  type="text"
                  value={slug}
                  onChange={(event) => onSlugChange(normalizeSlug(event.target.value))}
                  placeholder="your-profile"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby="profile-url-status"
                  className="h-12 min-w-0 flex-1 rounded-r-2xl bg-transparent px-3.5 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              <div id="profile-url-status" className="mt-2.5 min-h-5" aria-live="polite">
                {availability === "checking" && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking {displayUrl}
                  </p>
                )}
                {availability === "available" && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
                    <Check className="h-3.5 w-3.5" />
                    {displayUrl} is available
                  </p>
                )}
                {availability === "taken" && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                    <CircleAlert className="h-3.5 w-3.5" />
                    This public URL is already in use
                  </p>
                )}
                {availability === "unknown" && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-300/80">
                    <CircleAlert className="h-3.5 w-3.5" />
                    Availability will be verified when you create the profile
                  </p>
                )}
                {availability === "idle" && (
                  <p className="truncate font-sans text-xs text-muted-foreground">{displayUrl}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/25 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{planName}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Current profile allowance</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-accent/15 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-bold text-accent/90">
                {currentProfiles} of {profileLimit}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border/60 bg-background/20 px-6 py-4 sm:px-7">
            <DialogClose asChild>
              <button
                type="button"
                disabled={loading}
                className="h-11 rounded-xl border border-border/80 bg-transparent px-5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={submitDisabled}
              className="btn-primary-glow inline-flex h-11 min-w-[184px] items-center justify-center gap-2 whitespace-nowrap !rounded-xl !px-5 !py-0 text-sm font-bold disabled:pointer-events-none disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create &amp; customize
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
