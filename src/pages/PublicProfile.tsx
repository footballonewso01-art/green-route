import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { ProfileCanvas } from "@/components/profile/ProfileCanvas";
import {
  isLightProfileColor,
  normalizeProfileBackgroundMode,
  normalizeProfileBackgroundOverlay,
  normalizeProfileBackgroundPosition,
  normalizeProfileTemplate,
  supportsProfileImageBackground,
} from "@/lib/profileTemplates";
import {
  normalizeLinkCardStyle,
  normalizeSocialLinkStyle,
} from "@/lib/profileAppearance";
import { useSeo } from "@/hooks/useSeo";
import { getProfileLinkTitle, ProfileLinkItem } from "@/lib/profileLinks";
import { getPublicProfile } from "@/lib/publicAssets";

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  profile_template?: string;
  link_card_style?: string;
  social_link_style?: string;
  full_avatar_url?: string;
  profile_background_mode?: string;
  profile_background_image?: string;
  full_profile_background_url?: string;
  profile_background_position?: string;
  profile_background_overlay?: string;
  card_color?: string;
  online_counter?: boolean;
  social_links?: { id: string; url: string; icon_type: string; icon_value: string; label?: string }[];
}

function OnlineCounter({ cardColor, forceDark = false }: { cardColor: string; forceDark?: boolean }) {
  const base = useMemo(() => Math.floor(Math.random() * (387 - 318 + 1)) + 318, []);
  const [count, setCount] = useState(base);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setCount(prev => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(318, Math.min(387, prev + delta));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const light = forceDark ? false : isLightProfileColor(cardColor);

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className={`text-xs font-medium tracking-wide ${light ? 'text-black/50' : 'text-white/50'}`}>
        <span className={`font-bold ${light ? 'text-black/70' : 'text-white/70'}`}>{count}</span> people are currently watching this
      </span>
    </div>
  );
}

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<(ProfileData & { plan?: string }) | null>(null);
  const [links, setLinks] = useState<ProfileLinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Technical SEO: Temporarily disable indexing for all user profiles.
  // This can be scaled in the future by checking user settings, plan limits, or profile completeness (e.g., profile.seo_indexing_enabled)
  const isProfileSeoIndexed = false;

  useSeo({
    title: profile
      ? `${profile.name} (@${username})`
      : `@${username || ""}`,
    description: profile?.bio
      ? `${profile.bio.slice(0, 155)}${profile.bio.length > 155 ? "…" : ""}`
      : `Check out @${username || ""} on Linktery for smart links, a bio page, and more.`,
    canonical: `/${username || ""}`,
    noIndex: !isProfileSeoIndexed,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        const currentDomain = window.location.host;
        const response = await getPublicProfile(username, currentDomain);
        const profileRecord = response.profile;

        setProfile({
          id: profileRecord.id,
          name: profileRecord.name || profileRecord.slug,
          bio: profileRecord.bio || "",
          profile_template: normalizeProfileTemplate(profileRecord.profile_template),
          link_card_style: normalizeLinkCardStyle(profileRecord.link_card_style),
          social_link_style: normalizeSocialLinkStyle(profileRecord.social_link_style),
          avatar: profileRecord.name ? profileRecord.name.charAt(0).toUpperCase() : profileRecord.slug.charAt(0).toUpperCase(),
          full_avatar_url: profileRecord.avatar ? pb.files.getUrl(profileRecord, profileRecord.avatar) : undefined,
          profile_background_mode: normalizeProfileBackgroundMode(profileRecord.profile_background_mode),
          profile_background_image: profileRecord.profile_background_image || "",
          full_profile_background_url: profileRecord.profile_background_image
            ? pb.files.getUrl(profileRecord, profileRecord.profile_background_image, { thumb: "1280x0" })
            : undefined,
          profile_background_position: normalizeProfileBackgroundPosition(profileRecord.profile_background_position),
          profile_background_overlay: normalizeProfileBackgroundOverlay(profileRecord.profile_background_overlay),
          card_color: profileRecord.card_color || "#000000",
          online_counter: !!profileRecord.online_counter,
          social_links: Array.isArray(profileRecord.social_links) ? profileRecord.social_links : [],
          plan: profileRecord.plan || "creator",
        });

        setLinks(response.links.flatMap<ProfileLinkItem>((assignment) => {
          if (!assignment.link?.active) return [];
          return [{
            ...assignment,
            user_id: "",
            expand: { link_id: assignment.link },
            link: assignment.link,
            backgroundUrl: assignment.bg_image ? pb.files.getUrl(assignment, assignment.bg_image) : null,
          }];
        }));


      } catch (error: unknown) {
        toast.error("Profile not found");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-start justify-center sm:p-4">
        <div className="w-full max-w-[528px] min-h-[100dvh] sm:min-h-[calc(100dvh-2rem)] sm:rounded-3xl overflow-hidden border border-white/[0.07] bg-black animate-pulse">
          <div className="aspect-[10/7] w-full bg-white/[0.055]" />
          <div className="relative -mt-12 px-5">
            <div className="h-8 w-1/2 rounded-lg bg-white/[0.09] mx-auto" />
            <div className="mt-2 h-4 w-1/3 rounded-md bg-white/[0.055] mx-auto" />
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-10 w-10 rounded-full bg-white/[0.055]" />
              ))}
            </div>
          </div>
          <div className="space-y-3 mt-7 px-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[62px] bg-white/[0.065] rounded-[18px] w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Profile Not Found</h1>
          <p className="text-muted-foreground mt-2">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const profileTemplate = normalizeProfileTemplate(profile.profile_template);
  const linkCardStyle = normalizeLinkCardStyle(profile.link_card_style);
  const socialLinkStyle = normalizeSocialLinkStyle(profile.social_link_style);
  const cardColor = profile.card_color || "#000000";
  const backgroundMode = normalizeProfileBackgroundMode(profile.profile_background_mode);
  const backgroundPosition = normalizeProfileBackgroundPosition(profile.profile_background_position);
  const backgroundOverlay = normalizeProfileBackgroundOverlay(profile.profile_background_overlay);
  const imageBackgroundActive = backgroundMode === "image"
    && supportsProfileImageBackground(profileTemplate)
    && Boolean(profile.full_profile_background_url);
  const darkProfileSurface = profileTemplate === "visual" || imageBackgroundActive;
  const ambientImageUrl = imageBackgroundActive
    ? profile.full_profile_background_url
    : profile.full_avatar_url;

  return (
    <div className="relative isolate flex min-h-[100dvh] items-start justify-center overflow-x-clip bg-[#120b14] pt-0 text-white sm:px-4">
      {/*
        Keep the ambience attached to the viewport instead of the document.
        The oversized blurred image must never expand the page's scroll area;
        long profiles should use the browser's single, normal scroll context.
      */}
      <div
        data-profile-ambient-background="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-[-10%] scale-110 blur-[42px]">
          {ambientImageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{ backgroundImage: `url('${ambientImageUrl}')` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/45 via-pink-500/30 to-purple-900/55" />
        </div>
        <div className="absolute inset-0 bg-[#120b14]/45 backdrop-blur-[24px]" />
        <div className="absolute left-1/2 top-[-20%] h-[600px] w-[1200px] -translate-x-1/2 rounded-full bg-accent/10 opacity-30 blur-[150px]" />
      </div>

      <div className="relative z-10 flex w-full justify-center">
        <ProfileCanvas
          template={profileTemplate}
          linkCardStyle={linkCardStyle}
          socialLinkStyle={socialLinkStyle}
          name={profile.name}
          username={username || ""}
          bio={profile.bio}
          avatarUrl={profile.full_avatar_url}
          avatarFallback={profile.avatar}
          cardColor={cardColor}
          backgroundMode={backgroundMode}
          backgroundImageUrl={profile.full_profile_background_url}
          backgroundPosition={backgroundPosition}
          backgroundOverlay={backgroundOverlay}
          socialLinks={profile.social_links}
          onlineCounter={profile.online_counter ? <OnlineCounter cardColor={cardColor} forceDark={darkProfileSurface} /> : undefined}
          plan={profile.plan}
          links={links.map((item) => ({
            id: item.id,
            title: getProfileLinkTitle(item),
            href: `/${item.link.slug}?ref=profile&profile_id=${encodeURIComponent(profile.id)}&profile_link_id=${encodeURIComponent(item.id)}`,
            destinationUrl: item.link.destination_url,
            iconType: item.link.icon_type,
            iconValue: item.link.icon_value,
            size: item.size,
            backgroundUrl: item.backgroundUrl,
          }))}
        />
      </div>
    </div >
  );
}
