import { Layers3, UserRound } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";

export const ALL_PROFILES_SCOPE = "all";

export interface AnalyticsProfileOption {
  id: string;
  name: string;
  slug: string;
}

interface ProfileScopeSelectProps {
  profiles: AnalyticsProfileOption[];
  value: string;
  onValueChange: (value: string) => void;
}

const getProfileLabel = (profile: AnalyticsProfileOption) =>
  profile.name.trim() || profile.slug;

const getProfileInitial = (profile: AnalyticsProfileOption) =>
  getProfileLabel(profile).charAt(0).toUpperCase() || "P";

export default function ProfileScopeSelect({
  profiles,
  value,
  onValueChange,
}: ProfileScopeSelectProps) {
  const activeProfile = profiles.find((profile) => profile.id === value);
  const isAllProfiles = value === ALL_PROFILES_SCOPE;
  const profileCountLabel = `${profiles.length} ${profiles.length === 1 ? "profile" : "profiles"}`;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label="Profile analytics scope"
        className="h-14 w-full min-w-0 rounded-2xl border-border/80 bg-background/55 py-0 pl-2.5 pr-3 shadow-sm transition-[border-color,background-color,box-shadow] hover:border-border hover:bg-background/75 focus:ring-2 focus:ring-accent/20 focus:ring-offset-0 sm:w-[21rem] [&>svg]:ml-3 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent/[0.08] text-accent">
            {isAllProfiles ? <Layers3 className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center text-left">
            <span className="truncate text-sm font-semibold leading-5 text-foreground">
              {isAllProfiles ? "All profiles" : activeProfile ? getProfileLabel(activeProfile) : "Selected profile"}
            </span>
            <span className="truncate text-[11px] leading-4 text-muted-foreground">
              {isAllProfiles
                ? `Combined analytics across ${profileCountLabel}`
                : activeProfile
                  ? `@${activeProfile.slug}`
                  : "Profile unavailable"}
            </span>
          </span>
        </div>
      </SelectTrigger>

      <SelectContent
        position="popper"
        side="bottom"
        align="end"
        sideOffset={8}
        className="z-[120] max-h-80 w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1.5rem)] rounded-2xl border-border/80 bg-popover/95 shadow-2xl backdrop-blur-xl"
      >
        <SelectItem
          value={ALL_PROFILES_SCOPE}
          textValue="All profiles"
          className="rounded-xl py-2.5 pl-9 pr-3 focus:bg-white/[0.06] focus:text-foreground data-[state=checked]:bg-accent/[0.08]"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent/[0.08] text-accent">
              <Layers3 className="h-4 w-4" />
            </span>
            <span className="flex min-w-0 flex-col text-left">
              <span className="text-sm font-semibold leading-5 text-foreground">All profiles</span>
              <span className="text-[11px] leading-4 text-muted-foreground">
                Combined performance across {profileCountLabel}
              </span>
            </span>
          </span>
        </SelectItem>

        <SelectSeparator className="my-1.5 bg-border/70" />

        {profiles.map((profile) => (
          <SelectItem
            key={profile.id}
            value={profile.id}
            textValue={`${getProfileLabel(profile)} @${profile.slug}`}
            className="rounded-xl py-2.5 pl-9 pr-3 focus:bg-white/[0.06] focus:text-foreground data-[state=checked]:bg-accent/[0.08]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-xs font-bold text-foreground">
                {getProfileInitial(profile)}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-semibold leading-5 text-foreground">
                  {getProfileLabel(profile)}
                </span>
                <span className="truncate text-[11px] leading-4 text-muted-foreground">
                  @{profile.slug}
                </span>
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
