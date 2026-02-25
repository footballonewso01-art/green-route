import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  theme: string;
  full_avatar_url?: string;
}

interface LinkItem {
  id: string;
  slug: string;
  destination_url: string;
  active: boolean;
  title?: string;
  order?: number;
  show_on_profile?: boolean;
}

const THEME_STYLES: Record<string, string> = {
  "minimal-dark": "bg-background text-white",
  "sunset": "bg-gradient-to-br from-orange-600/30 via-pink-600/20 to-purple-800/40 text-white",
  "ocean": "bg-gradient-to-br from-blue-700/30 via-cyan-600/20 to-blue-900/40 text-white",
  "emerald": "bg-gradient-to-br from-emerald-700/30 via-teal-600/20 to-emerald-900/40 text-white",
  "glass": "bg-white/5 backdrop-blur-2xl text-white border-white/10",
};

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
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
        });

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
    <div className={`min-h-screen ${currentThemeClass} relative overflow-hidden flex flex-col items-center px-4 py-16 sm:py-24 transition-colors duration-700`}>
      {/* Background Glow (Conditional based on theme) */}
      {profile.theme === "minimal-dark" && (
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      )}

      <div className="w-full max-w-md z-10 flex flex-col items-center animate-fade-in">
        {/* Avatar */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-accent/50 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative w-28 h-28 rounded-full bg-surface border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
            {profile.full_avatar_url ? (
              <img src={profile.full_avatar_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">{profile.avatar}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="text-center mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">@{profile.name}</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed italic">{profile.bio}</p>
        </div>

        {/* Links */}
        <div className="w-full mt-10 space-y-4">
          {links.length === 0 ? (
            <div className="text-center p-8 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm">
              <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No public links yet.</p>
            </div>
          ) : (
            links.map((link) => (
              <a
                key={link.id}
                href={`/${link.slug}`}
                className="relative block w-full group overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/20"
              >
                {/* Border gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 group-hover:from-accent/40 group-hover:via-accent/20 group-hover:to-accent/40 transition-colors duration-500" />

                {/* Inner card */}
                <div className="relative min-h-[64px] h-full w-full bg-surface hover:bg-surface-hover backdrop-blur-xl rounded-[15px] flex items-center justify-between px-6 py-4 transition-colors duration-300">
                  <div className="flex flex-col truncate pr-4">
                    <span className="text-sm font-semibold text-white truncate group-hover:text-accent transition-colors duration-300 uppercase tracking-wide">
                      {link.title || `/${link.slug}`}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5 text-white/50 group-hover:text-accent transition-colors duration-300" />
                  </div>
                </div>
              </a>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors group">
            <span className="opacity-60">Powered by</span>
            <span className="font-bold flex items-center gap-1 group-hover:opacity-100">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-accent to-accent/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-background"></div>
              </div>
              GreenRoute
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
