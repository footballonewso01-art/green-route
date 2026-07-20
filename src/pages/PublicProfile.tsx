import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { ProfileCanvas } from "@/components/profile/ProfileCanvas";
import {
  isLightProfileColor,
  normalizeProfileTemplate,
} from "@/lib/profileTemplates";
import {
  normalizeLinkCardStyle,
  normalizeSocialLinkStyle,
} from "@/lib/profileAppearance";
import { useSeo } from "@/hooks/useSeo";
import { getProfileLinkTitle, ProfileLinkItem, ProfileLinkRecord } from "@/lib/profileLinks";

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  profile_template?: string;
  link_card_style?: string;
  social_link_style?: string;
  full_avatar_url?: string;
  card_color?: string;
  online_counter?: boolean;
  social_links?: { id: string; url: string; icon_type: string; icon_value: string; label?: string }[];
}

function OnlineCounter({ cardColor }: { cardColor: string }) {
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

  const light = isLightProfileColor(cardColor);

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
        // Fetch profile by slug and domain
        const profileRecord = await pb.collection('public_profiles').getFirstListItem(
          `slug="${username}" && (domain="${currentDomain}" || domain="")`,
          { expand: 'user_id' }
        );

        const userRecord = profileRecord.expand?.user_id || {};

        setProfile({
          id: profileRecord.id,
          name: profileRecord.name || profileRecord.slug,
          bio: profileRecord.bio || "",
          profile_template: normalizeProfileTemplate(profileRecord.profile_template),
          link_card_style: normalizeLinkCardStyle(profileRecord.link_card_style),
          social_link_style: normalizeSocialLinkStyle(profileRecord.social_link_style),
          avatar: profileRecord.name ? profileRecord.name.charAt(0).toUpperCase() : profileRecord.slug.charAt(0).toUpperCase(),
          full_avatar_url: profileRecord.avatar ? pb.files.getUrl(profileRecord, profileRecord.avatar) : undefined,
          card_color: profileRecord.card_color || "#000000",
          online_counter: !!profileRecord.online_counter,
          social_links: Array.isArray(profileRecord.social_links) ? profileRecord.social_links : [],
          plan: userRecord.plan || "creator",
        });

        // Profile composition is public, while redirect behavior remains on the expanded core Link.
        const assignments = await pb.collection('profile_links').getFullList<ProfileLinkRecord>({
          filter: `profile_id="${profileRecord.id}" && visible=true`,
          sort: 'order,created',
          expand: 'link_id',
          requestKey: null,
        });
        setLinks(assignments.flatMap<ProfileLinkItem>((assignment) => {
          const link = assignment.expand?.link_id;
          if (!link?.active) return [];
          return [{
            ...assignment,
            link,
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

  return (
    <div className="min-h-[100dvh] bg-[#120b14] text-white relative overflow-x-hidden flex items-start justify-center sm:px-4 pt-0">
      {/* Mobile-first ambient background: Sunset by default, avatar-derived when available. */}
      <div className="pointer-events-none absolute inset-[-10%] z-0 overflow-hidden blur-[42px] scale-110">
        {profile.full_avatar_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url('${profile.full_avatar_url}')` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/45 via-pink-500/30 to-purple-900/55" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#120b14]/45 backdrop-blur-[24px]" />

      {/* Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-accent/10 blur-[150px] rounded-full pointer-events-none opacity-30 z-0" />

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
          socialLinks={profile.social_links}
          onlineCounter={profile.online_counter ? <OnlineCounter cardColor={cardColor} /> : undefined}
          plan={profile.plan}
          links={links.map((item) => ({
            id: item.id,
            title: getProfileLinkTitle(item),
            href: `/${item.link.slug}?ref=profile`,
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
