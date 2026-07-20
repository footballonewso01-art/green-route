export interface LinkProfileOption {
  id: string;
}

export interface LinkProfilePrefill {
  showOnProfile: boolean;
  profileId: string;
  collapseSelector: boolean;
}

export function getNewLinkHrefForFilter(selectedProfileFilter: string): string {
  if (selectedProfileFilter === "all") return "/dashboard/links/create";
  return `/dashboard/links/create?profile=${encodeURIComponent(selectedProfileFilter)}`;
}

export function resolveNewLinkProfilePrefill(
  requestedProfileId: string | null,
  profiles: LinkProfileOption[],
): LinkProfilePrefill | null {
  const requestedProfile = profiles.find(profile => profile.id === requestedProfileId);
  if (requestedProfile) {
    return {
      showOnProfile: true,
      profileId: requestedProfile.id,
      collapseSelector: true,
    };
  }

  if (requestedProfileId === "none") {
    return {
      showOnProfile: false,
      profileId: "",
      collapseSelector: false,
    };
  }

  // Preserve the existing convenience default without publishing implicitly.
  if (profiles.length === 1) {
    return {
      showOnProfile: false,
      profileId: profiles[0].id,
      collapseSelector: false,
    };
  }

  return null;
}
