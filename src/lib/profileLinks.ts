export interface CoreLinkRecord {
  id: string;
  slug: string;
  destination_url: string;
  clicks_count: number;
  active: boolean;
  created: string;
  title?: string;
  mode?: string;
  icon_type?: "preset" | "emoji" | "custom" | "none";
  icon_value?: string;
  domain?: string;
}

export interface ProfileLinkRecord {
  id: string;
  user_id: string;
  profile_id: string;
  link_id: string;
  order?: number;
  visible: boolean;
  title_override?: string;
  size?: "regular" | "large";
  bg_image?: string;
  created: string;
  updated: string;
  expand?: {
    link_id?: CoreLinkRecord;
  };
}

export interface ProfileLinkItem extends ProfileLinkRecord {
  link: CoreLinkRecord;
  backgroundUrl: string | null;
}

export function getProfileLinkTitle(item: Pick<ProfileLinkItem, "title_override" | "link">): string {
  return item.title_override?.trim() || item.link.title?.trim() || `/${item.link.slug}`;
}

export function getAssignedProfileIds(
  assignments: Array<Pick<ProfileLinkRecord, "link_id" | "profile_id" | "visible">>,
  linkId: string,
): string[] {
  return assignments
    .filter(assignment => assignment.link_id === linkId && assignment.visible)
    .map(assignment => assignment.profile_id);
}
