import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { IconRenderer } from '@/components/icons/IconRenderer';
import { checkPlan } from "@/lib/plans";

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  theme: string;
  full_avatar_url?: string;
  custom_theme_bg?: string;
  social_links?: any[];
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

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<(ProfileData & { plan?: string }) | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        // Fetch user by username
        const userRecord = await pb.collection('users').getFirstListItem(`username="${username}"`);

        setProfile({
          id: userRecord.id,
          name: userRecord.name || userRecord.username,
          bio: userRecord.bio || "",
          theme: userRecord.theme || "minimal-dark",
          avatar: userRecord.name ? userRecord.name.charAt(0).toUpperCase() : userRecord.username.charAt(0).toUpperCase(),
          full_avatar_url: userRecord.avatar ? pb.files.getUrl(userRecord, userRecord.avatar) : undefined,
          custom_theme_bg: userRecord.custom_theme_bg ? pb.files.getUrl(userRecord, userRecord.custom_theme_bg) : undefined,
          social_links: Array.isArray(userRecord.social_links) ? userRecord.social_links : [],
          plan: userRecord.plan || "creator",
        });
        // ... (rest of the code update below)

        // Fetch active links for this user, sorted by 'order'
        const linkRecords = await pb.collection('links').getFullList<LinkItem>({
          filter: `user_id="${userRecord.id}" && active=true && show_on_profile!=false`,
          sort: 'order,-created',
        });
        setLinks(linkRecords);
      } catch (error: any) {
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

  return (
    <div className={`min-h-screen ${currentThemeClass} relative overflow-hidden flex items-start justify-center px-4 pt-4 sm:pt-8 transition-colors duration-700`}
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
      <div className="w-full max-w-[528px] bg-black rounded-[1.5rem] min-h-[95vh] mt-[2vh] sm:mt-[0vh] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_40px_rgba(0,0,0,0.4)] animate-fade-in relative z-10 flex flex-col">

        {/* Top Header with Avatar and Fade */}
        <div className="relative aspect-[10/9] w-full overflow-hidden shrink-0">
          {profile.full_avatar_url ? (
            <img
              src={profile.full_avatar_url}
              alt={profile.name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full bg-surface flex items-center justify-center">
              <span className="text-6xl font-bold bg-gradient-to-br from-white to-white/30 bg-clip-text text-transparent">
                {profile.avatar}
              </span>
            </div>
          )}
          {/* Fade to Black Overlay - Lower and softer */}
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent transition-all duration-700" />
        </div >

        {/* Profile Content */}
        <div className="px-5 pb-32 -mt-10 relative">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
              {profile.name}
            </h1>
            <p className="text-muted-foreground text-sm font-medium tracking-wide">
              @{username}
            </p>
          </div>

          {/* Social Icons Quick Bar */}
          {
            profile.social_links && profile.social_links.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
                {profile.social_links.map((social: any) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent/20 hover:border-accent/40 hover:scale-105 transition-all duration-300 shadow-lg group"
                  >
                    <IconRenderer type={social.icon_type} value={social.icon_value} className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>
            )
          }

          {/* Bio */}
          <div className="mt-3 text-center px-3">
            <p className="text-white text-sm leading-relaxed max-w-[280px] mx-auto">
              {profile.bio}
            </p>
          </div>

          {/* Links Section */}
          <div className="mt-6 space-y-3.5">
            {links.length === 0 ? (
              <div className="text-center p-10 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm">
                <Globe className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">No public links yet</p>
              </div>
            ) : (
              links.map((link) => {
                const bgImageUrl = (link.size === 'large' && (link as any).bg_image)
                  ? pb.files.getUrl(link, (link as any).bg_image)
                  : null;

                return (
                  <a
                    key={link.id}
                    href={`/${link.slug}`}
                    className={`group relative block w-full bg-[#111] hover:bg-[#161616] border border-white/5 hover:border-accent/30 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden ${link.size === 'large' ? 'aspect-[10/4.3]' : 'py-[14px] px-4'}`}
                  >
                    {/* Size Large Custom Background */}
                    {bgImageUrl && (
                      <>
                        <div
                          className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-105"
                          style={{ backgroundImage: `url('${bgImageUrl}')` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 z-0" />
                      </>
                    )}

                    <div className={`relative z-10 flex ${link.size === 'large' ? 'flex-col h-full p-5 justify-between' : 'items-center justify-center min-h-[40px]'}`}>
                      <div className={`${link.size === 'large' ? 'shrink-0 self-start' : 'absolute left-0 shrink-0'} w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden group-hover:bg-accent/20 transition-colors shadow-lg`}>
                        <IconRenderer
                          type={link.icon_type}
                          value={link.icon_value}
                          url={link.destination_url}
                          className="w-7 h-7 text-white/90 group-hover:text-accent transition-colors drop-shadow-md"
                        />
                      </div>

                      <div className={`${link.size === 'large' ? 'mt-auto text-left w-full' : 'text-center px-12'}`}>
                        <span className={`block font-bold text-white group-hover:text-accent transition-colors uppercase tracking-wider ${link.size === 'large' ? 'text-lg drop-shadow-lg' : 'text-sm'}`}>
                          {link.title || `/${link.slug}`}
                        </span>
                      </div>

                      <div className={`absolute ${link.size === 'large' ? 'right-4 top-4' : 'right-0 top-0'} w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg`}>
                        <ExternalLink className="w-3.5 h-3.5 text-accent" />
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>

          {/* Footer Branding */}
          {
            !checkPlan(profile.plan, "remove_branding") && (
              <div className="mt-10 mb-2 text-center">
                <a href="/" className="inline-flex items-center gap-2 text-[10px] text-muted-foreground/50 hover:text-white transition-colors group">
                  <span className="uppercase tracking-widest font-medium">Powered by</span>
                  <span className="font-black flex items-center gap-1.5 group-hover:opacity-100">
                    <img src="/logo.png" alt="GreenRoute" className="h-4 w-auto grayscale mix-blend-screen opacity-80 group-hover:opacity-100 transition-opacity" />
                  </span>
                </a>
              </div>
            )
          }
        </div >
      </div >
    </div >
  );
}
