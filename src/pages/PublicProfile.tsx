import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { IconRenderer } from "@/components/icons/IconRenderer";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { checkPlan } from "@/lib/plans";
import {
  isLightProfileColor,
  normalizeProfileTemplate,
} from "@/lib/profileTemplates";
import { useSeo } from "@/hooks/useSeo";

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  theme: string;
  profile_template?: string;
  full_avatar_url?: string;
  custom_theme_bg?: string;
  card_color?: string;
  online_counter?: boolean;
  social_links?: { id: string; url: string; icon_type: string; icon_value: string }[];
}

interface LinkItem {
  id: string;
  slug: string;
  destination_url: string;
  active: boolean;
  title?: string;
  order?: number;
  show_on_profile?: boolean;
  icon_type?: "preset" | "emoji" | "custom" | "none";
  icon_value?: string;
  size?: "regular" | "large";
  bg_image?: string;
}

const THEME_STYLES: Record<string, string> = {
  "minimal-dark": "bg-background text-white",
  "sunset": "bg-gradient-to-br from-orange-600/30 via-pink-600/20 to-purple-800/40 text-white",
  "ocean": "bg-gradient-to-br from-blue-700/30 via-cyan-600/20 to-blue-900/40 text-white",
  "emerald": "bg-gradient-to-br from-emerald-700/30 via-teal-600/20 to-emerald-900/40 text-white",
  "glass": "bg-white/5 backdrop-blur-2xl text-white border-white/10",
  "custom": "text-white"
};

const SOCIAL_PLATFORMS = [
  { key: 'instagram', pattern: /instagram\.com/i, icon: '📸', label: 'Instagram' },
  { key: 'tiktok', pattern: /tiktok\.com/i, icon: '🎵', label: 'TikTok' },
  { key: 'youtube', pattern: /youtube\.com|youtu\.be/i, icon: '▶️', label: 'YouTube' },
  { key: 'twitter', pattern: /twitter\.com|x\.com/i, icon: '𝕏', label: 'X / Twitter' },
  { key: 'telegram', pattern: /t\.me|telegram/i, icon: '✈️', label: 'Telegram' },
  { key: 'github', pattern: /github\.com/i, icon: '🐙', label: 'GitHub' },
  { key: 'linkedin', pattern: /linkedin\.com/i, icon: '💼', label: 'LinkedIn' },
  { key: 'discord', pattern: /discord\.gg|discord\.com/i, icon: '🎮', label: 'Discord' },
  { key: 'twitch', pattern: /twitch\.tv/i, icon: '🟣', label: 'Twitch' },
  { key: 'spotify', pattern: /spotify\.com|open\.spotify/i, icon: '🎧', label: 'Spotify' },
];

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
  const [links, setLinks] = useState<LinkItem[]>([]);
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
      : `Check out @${username || ""} on Linktery — smart links, bio page, and more.`,
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
          theme: profileRecord.theme || "minimal-dark",
          profile_template: normalizeProfileTemplate(profileRecord.profile_template),
          avatar: profileRecord.name ? profileRecord.name.charAt(0).toUpperCase() : profileRecord.slug.charAt(0).toUpperCase(),
          full_avatar_url: profileRecord.avatar ? pb.files.getUrl(profileRecord, profileRecord.avatar) : undefined,
          custom_theme_bg: profileRecord.custom_theme_bg ? pb.files.getUrl(profileRecord, profileRecord.custom_theme_bg) : undefined,
          card_color: profileRecord.card_color || "#000000",
          online_counter: !!profileRecord.online_counter,
          social_links: Array.isArray(profileRecord.social_links) ? profileRecord.social_links : [],
          plan: userRecord.plan || "creator",
        });

        // Fetch active links for this profile, sorted by 'order'
        const linkRecords = await pb.collection('links').getList<LinkItem>(1, 100, {
          filter: `profile_id="${profileRecord.id}" && active=true && show_on_profile!=false`,
          sort: 'order,-created',
        });
        setLinks(linkRecords.items);


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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-pulse">
          <div className="w-24 h-24 rounded-full bg-surface mx-auto"></div>
          <div className="space-y-4 text-center">
            <div className="h-6 bg-surface rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-surface rounded w-3/4 mx-auto"></div>
          </div>
          <div className="space-y-4 mt-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-surface rounded-2xl w-full"></div>
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

  const currentThemeClass = THEME_STYLES[profile.theme] || THEME_STYLES["minimal-dark"];
  const profileTemplate = normalizeProfileTemplate(profile.profile_template);
  const cardColor = profile.card_color || "#000000";

  return (
    <div className={`min-h-screen ${currentThemeClass} relative overflow-hidden flex items-start justify-center sm:px-4 pt-0 transition-colors duration-700`}
      style={profile.theme === "custom" && profile.custom_theme_bg ? {
        backgroundImage: `url('${profile.custom_theme_bg}')`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      } : {}}
    >
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-[70px] z-0" />

      {/* Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-accent/10 blur-[150px] rounded-full pointer-events-none opacity-30 z-0" />

      {/* Main Profile Card */}
      <div className="w-full max-w-[528px] sm:rounded-[1.5rem] min-h-[100dvh] sm:min-h-[98vh] sm:mt-[1vh] sm:mb-[1vh] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_40px_rgba(0,0,0,0.4)] animate-fade-in relative z-10 flex flex-col" style={{ backgroundColor: cardColor }}>

        <ProfileIdentity
          template={profileTemplate}
          name={profile.name}
          username={username || ""}
          bio={profile.bio}
          avatarUrl={profile.full_avatar_url}
          avatarFallback={profile.avatar}
          cardColor={cardColor}
          socialLinks={profile.social_links}
          onlineCounter={profile.online_counter ? <OnlineCounter cardColor={cardColor} /> : undefined}
        />

        {/* Profile content shared by every visual template. */}
        <div className={`pb-16 relative flex-1 flex flex-col ${profileTemplate === "cutout" ? "px-4 min-[380px]:px-6 sm:px-8" : "px-4"}`}>
          <div data-tracking-active="true" className="hidden" />

          {/* Links Section */}
          <div className="mt-6 space-y-3">
            {links.length === 0 ? (
              <div className="text-center p-10 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm">
                <Globe className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">No public links yet</p>
              </div>
            ) : (
              links.map((link) => {
                const bgImageUrl = link.bg_image
                  ? pb.files.getUrl(link, link.bg_image)
                  : null;
                const editorialLink = profileTemplate === "cutout" && link.size !== "large";

                return (
                  <a
                    key={link.id}
                    href={`/${link.slug}?ref=profile`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative block w-full transition-all duration-300 overflow-hidden will-change-transform isolate ${
                      editorialLink
                        ? `border-b rounded-none px-1 py-3 ${isLightProfileColor(cardColor) ? "border-black/15 hover:bg-black/5" : "border-white/15 hover:bg-white/5"}`
                        : `bg-[#111] hover:bg-[#161616] rounded-2xl hover:-translate-y-0.5 ${link.size === 'large' ? 'aspect-[10/6] sm:aspect-[10/4.3]' : 'py-[14px] px-5'}`
                    }`}
                  >
                    {/* Custom Background */}
                    {bgImageUrl && (
                      <>
                        <img
                          src={bgImageUrl}
                          alt="Background"
                          className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className={`absolute inset-0 z-0 ${link.size === 'large' ? 'bg-gradient-to-t from-black/90 via-black/40 to-black/20' : 'bg-black/50'}`} />
                      </>
                    )}

                    <div className={`relative z-10 flex ${link.size === 'large' ? 'flex-col h-full p-5 justify-between' : editorialLink ? 'items-center min-h-[40px]' : 'items-center justify-center min-h-[40px]'}`}>
                      <div className={`${link.size === 'large' ? 'shrink-0 self-start' : editorialLink ? 'relative shrink-0 mr-3' : 'absolute left-0 shrink-0'} w-11 h-11 rounded-xl ${editorialLink ? (isLightProfileColor(cardColor) ? 'bg-black/5' : 'bg-white/5') : bgImageUrl ? 'bg-white/20 backdrop-blur-md' : 'bg-white/10'} flex items-center justify-center overflow-hidden group-hover:bg-accent/20 transition-colors ${editorialLink ? '' : 'shadow-lg'}`}>
                        <IconRenderer
                          type={link.icon_type}
                          value={link.icon_value}
                          url={link.destination_url}
                          className="w-7 h-7 text-white/90 group-hover:text-accent transition-colors drop-shadow-md"
                        />
                      </div>

                      <div className={`${link.size === 'large' ? 'mt-auto text-center w-full px-12' : editorialLink ? 'text-left pr-10 flex-1' : 'text-center px-12'}`}>
                        <span className={`block font-bold group-hover:text-accent transition-colors uppercase tracking-wider ${isLightProfileColor(cardColor) && editorialLink ? 'text-black' : 'text-white'} ${link.size === 'large' ? 'text-lg drop-shadow-lg' : 'text-sm'}`}>
                          {link.title || `/${link.slug}`}
                        </span>
                      </div>

                      <div className={`absolute ${link.size === 'large' ? 'right-4 top-4' : editorialLink ? 'right-0 top-1/2 -translate-y-1/2' : 'right-0 top-0'} w-8 h-8 rounded-lg ${editorialLink ? '' : 'bg-white/10 backdrop-blur-md shadow-lg'} flex items-center justify-center ${editorialLink ? 'opacity-60' : 'opacity-0'} group-hover:opacity-100 transition-opacity`}>
                        <ExternalLink className="w-3.5 h-3.5 text-accent" />
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>

          {/* Footer Branding & Legal - Pushed to absolute bottom */}
          <div className="mt-auto pt-16 flex flex-col items-center gap-6 pb-8 justify-end flex-grow">
            {!checkPlan(profile.plan, "remove_branding") && (
              <div className="text-center mt-auto">
                <a href="/" className={`inline-flex items-center gap-1.5 text-[10px] transition-colors group ${isLightProfileColor(cardColor) ? 'text-black/40 hover:text-black' : 'text-muted-foreground/50 hover:text-white'}`}>
                  <span className="uppercase tracking-widest font-medium translate-y-[1px]">Powered by</span>
                  <span className="font-black flex items-center gap-1 group-hover:opacity-100">
                    <img src="/logo.webp" alt="Linktery" className={`h-6 w-auto opacity-80 group-hover:opacity-100 transition-opacity ${isLightProfileColor(cardColor) ? 'invert' : 'grayscale mix-blend-screen'}`} />
                    <span className={`uppercase tracking-tighter text-[11px] translate-y-[0.5px] ${isLightProfileColor(cardColor) ? 'text-black/70 group-hover:text-black' : 'text-white/80 group-hover:text-white'}`}>Linktery</span>
                  </span>
                </a>
              </div>
            )}

            {/* Legal Links */}
            <div className={`flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest relative z-50 ${isLightProfileColor(cardColor) ? 'text-black/20' : 'text-white/20'}`}>
              <a href="/privacy" className={`transition-colors pointer-events-auto ${isLightProfileColor(cardColor) ? 'hover:text-black/60' : 'hover:text-white/60'}`}>Privacy Policy</a>
              <span>|</span>
              <a href="/terms" className={`transition-colors pointer-events-auto ${isLightProfileColor(cardColor) ? 'hover:text-black/60' : 'hover:text-white/60'}`}>Terms & Conditions</a>
            </div>
          </div>
        </div >
      </div >
    </div >
  );
}
