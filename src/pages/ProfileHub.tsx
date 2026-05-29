import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Globe, 
  Copy, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Layers,
  Link2,
  X,
  ChevronDown
} from "lucide-react";
import { PLANS, PlanType } from '@/lib/plans';
import { UpgradeModal } from "@/components/UpgradeModal";

const THEME_NAMES: Record<string, string> = {
  "minimal-dark": "Minimal Dark",
  "sunset": "Sunset Gradient",
  "ocean": "Ocean Deep",
  "emerald": "Emerald Breeze",
  "glass": "Glassmorphic",
  "custom": "Custom Background",
};

const THEME_PREVIEWS: Record<string, string> = {
  "minimal-dark": "bg-neutral-900 border-neutral-800",
  "sunset": "bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-pink-500/30",
  "ocean": "bg-gradient-to-br from-blue-600/20 to-cyan-400/20 border-blue-500/30",
  "emerald": "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  "glass": "bg-white/5 backdrop-blur-xl border-white/10",
  "custom": "bg-neutral-800/40 border-dashed border-neutral-700",
};

interface ProfileRecord {
  id: string;
  user_id: string;
  slug: string;
  domain: string;
  name?: string;
  bio?: string;
  theme: string;
  card_color?: string;
  avatar?: string;
  online_counter?: boolean;
}

interface LinkRecord {
  id: string;
  user_id: string;
  profile_id?: string;
  slug: string;
  destination_url: string;
  active: boolean;
  show_on_profile?: boolean;
}

/** Returns a visible accent color — falls back to green if card_color is too dark/gray, otherwise boosts lightness to ensure high readability on dark UI */
function getAccentColor(hex?: string): string {
  const fallback = '#22C55E';
  if (!hex) return fallback;
  
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length !== 6) return fallback;

  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);

  // Normalize RGB to [0, 1]
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  // If it's a very dark gray or black (low saturation and low lightness), return fallback green
  if (l < 0.2 && s < 0.1) {
    return fallback;
  }

  // If lightness is too low to be readable on dark background, boost it
  if (l < 0.55) {
    l = 0.58; // Boost to a readable 58% lightness
  }

  // Convert HSL back to Hex
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r2 = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g2 = Math.round(hue2rgb(p, q, h) * 255);
  const b2 = Math.round(hue2rgb(p, q, h - 1/3) * 255);

  const toHex = (x: number) => {
    const hexString = x.toString(16);
    return hexString.length === 1 ? '0' + hexString : hexString;
  };

  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

const availableDomains = import.meta.env.VITE_AVAILABLE_DOMAINS?.split(",").map((d: string) => d.trim()).filter(Boolean) || [typeof window !== 'undefined' ? window.location.host : 'localhost'];

export default function ProfileHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileCountMap, setProfileCountMap] = useState<Record<string, number>>({});
  const [copiedProfileId, setCopiedProfileId] = useState<string | null>(null);

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileSlug, setNewProfileSlug] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDomain, setNewProfileDomain] = useState(availableDomains[0]);
  const [actionLoading, setActionLoading] = useState(false);

  // Plan Limits State
  const userPlan = (user as { plan?: string })?.plan || "creator";
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; description: string; planNeeded?: "pro" | "agency" }>({
    open: false,
    feature: "",
    description: "",
  });

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch public profiles
      const records = (await pb.collection('public_profiles').getFullList({
        filter: `user_id = "${user.id}"`,
        sort: 'created',
        requestKey: null,
      })) as unknown as ProfileRecord[];

      setProfiles(records);

      // 2. Fetch associated link counts for these profiles
      const links = (await pb.collection('links').getFullList({
        filter: `user_id = "${user.id}" && show_on_profile = true`,
        requestKey: null,
      })) as unknown as LinkRecord[];

      const counts: Record<string, number> = {};
      links.forEach((link) => {
        if (link.profile_id) {
          counts[link.profile_id] = (counts[link.profile_id] || 0) + 1;
        }
      });
      setProfileCountMap(counts);
    } catch (e) {
      console.error("Failed to load profiles:", e);
      toast.error("Failed to load public profiles");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user, fetchProfiles]);

  const handleCopyLink = (profile: ProfileRecord, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hostname = window.location.hostname;
    const cleanDomain = profile.domain || (hostname === 'localhost' ? 'localhost:5173' : hostname);
    const fullUrl = `https://${cleanDomain}/${profile.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedProfileId(profile.id);
    toast.success("Profile link copied!");
    setTimeout(() => setCopiedProfileId(null), 2000);
  };

  const handleCreateProfile = async () => {
    if (!newProfileSlug.trim()) {
      toast.error("Profile slug is required");
      return;
    }

    const cleanSlug = newProfileSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanSlug) {
      toast.error("Slug must contain only letters, numbers, dashes, or underscores");
      return;
    }

    // Check plan limits
    const maxProfiles = PLANS[userPlan as PlanType]?.limits?.public_profiles || 1;
    if (profiles.length >= maxProfiles) {
      setUpgradeModal({
        open: true,
        feature: "Multiple Biolink Profiles",
        description: `Your plan limits profile creation to ${maxProfiles} profile(s). Upgrade to create more pages.`,
        planNeeded: maxProfiles < 3 ? "pro" : "agency"
      });
      return;
    }

    setActionLoading(true);
    try {
      // Validate uniqueness globally across all profiles and links
      const [existingProfiles, existingLinks] = await Promise.all([
        pb.collection('public_profiles').getList(1, 1, { filter: `slug="${cleanSlug}"` }),
        pb.collection('links').getList(1, 1, { filter: `slug="${cleanSlug}"` })
      ]);

      if (existingProfiles.totalItems > 0) {
        toast.error("This slug is already in use by another public profile.");
        return;
      }
      if (existingLinks.totalItems > 0) {
        toast.error("This slug is already in use by a short link.");
        return;
      }

      const created = await pb.collection('public_profiles').create({
        user_id: user?.id,
        slug: cleanSlug,
        domain: newProfileDomain,
        name: newProfileName || cleanSlug,
        theme: "minimal-dark",
        card_color: "#000000",
      });

      toast.success("Biolink Profile created successfully!");
      setShowCreateModal(false);
      setNewProfileSlug("");
      setNewProfileName("");
      
      // Auto-navigate to settings page for newly created profile
      navigate(`/dashboard/profile/${created.id}`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to create profile");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProfile = async (profileId: string, profileSlug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you absolutely sure you want to delete profile @${profileSlug}? All custom visual themes, styling, and associated link lists inside it will be permanently deleted.`)) {
      return;
    }

    setActionLoading(true);
    try {
      // 1. Fetch links belonging to this profile
      const linksToUnlink = await pb.collection('links').getFullList({
        filter: `profile_id = "${profileId}"`,
        requestKey: null
      });

      // 2. Safely unlink associated links instead of deleting them
      for (const link of linksToUnlink) {
        await pb.collection('links').update(link.id, {
          profile_id: "",
          show_on_profile: false
        }, { requestKey: null });
      }

      // 3. Delete the profile itself
      await pb.collection('public_profiles').delete(profileId, { requestKey: null });

      toast.success("Profile deleted successfully. Associated links were unlinked.");
      await fetchProfiles();
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Failed to delete profile:", error);
      toast.error("Failed to delete profile: " + (err.message || "Unknown error"));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 overflow-visible text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-8 h-8 text-accent shrink-0" /> Biolink Profiles
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build and publish beautiful, responsive link-in-bio hub pages for your audiences.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary-glow text-sm !py-2.5 !px-5 font-semibold flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Loading your profiles...</p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 glass-card space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center animate-pulse">
            <Layers className="w-9 h-9 text-accent/40" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No Biolink Profiles Yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first public biolink profile page to start grouping your links.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn-primary-glow text-sm !py-2 !px-6 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {profiles.map((p) => {
            const avatarUrl = p.avatar ? pb.files.getUrl(p, p.avatar) : null;
            const linkCount = profileCountMap[p.id] || 0;
            const hostname = window.location.hostname;
            const cleanDomain = p.domain || (hostname === 'localhost' ? 'localhost:5173' : hostname);
            const fullUrl = `https://${cleanDomain}/${p.slug}`;
            const themeName = THEME_NAMES[p.theme] || "Minimal Dark";
            const themeClass = THEME_PREVIEWS[p.theme] || THEME_PREVIEWS["minimal-dark"];
            const accent = getAccentColor(p.card_color);

            return (
              <div 
                key={p.id}
                onClick={() => navigate(`/dashboard/profile/${p.id}`)}
                className="group relative flex flex-col rounded-2xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-xl"
                style={{
                  background: `linear-gradient(135deg, ${accent}12 0%, hsl(155 35% 9% / 0.85) 40%, hsl(155 35% 9% / 0.95) 100%)`,
                  boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)`,
                  borderLeft: `3px solid ${accent}60`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 40px ${accent}15, 0 4px 24px rgba(0,0,0,0.4)`;
                  e.currentTarget.style.borderLeftColor = `${accent}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `inset 0 1px 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)`;
                  e.currentTarget.style.borderLeftColor = `${accent}60`;
                }}
              >
                {/* Ambient glow orb — visible on hover */}
                <div 
                  className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-[0.12] transition-opacity duration-700 pointer-events-none"
                  style={{ backgroundColor: accent }}
                />

                <div className="relative z-10 p-5 flex flex-col justify-between flex-1 space-y-4">
                  {/* Identity row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {avatarUrl ? (
                        <div className="relative shrink-0">
                          <img 
                            src={avatarUrl} 
                            alt={p.name} 
                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 transition-all duration-500 group-hover:ring-white/20 group-hover:scale-[1.04]"
                          />
                          {p.online_counter && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: accent }} />
                              <span className="relative inline-flex rounded-full h-3 w-3 border-2 border-card" style={{ backgroundColor: accent }} />
                            </span>
                          )}
                        </div>
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-lg shrink-0 transition-all duration-500 group-hover:scale-[1.04]"
                          style={{ 
                            backgroundColor: `${accent}18`, 
                            borderColor: `${accent}35`,
                            color: accent
                          }}
                        >
                          {(p.name?.[0] || p.slug?.[0] || "?").toUpperCase()}
                        </div>
                      )}
                      
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-bold text-white text-[15px] leading-snug tracking-[-0.01em] truncate">
                          {p.name || p.slug}
                        </h3>
                        
                        <p className="text-[13px] font-semibold tracking-wide truncate" style={{ color: accent }}>
                          /{p.slug}
                        </p>
                        
                        <div className="flex items-center gap-1.5 text-[11px] text-white/40 mt-0.5">
                          <Globe className="w-3 h-3 shrink-0" />
                          <span className="truncate">{p.domain}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons — sleek glass control boxes */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleCopyLink(p, e)}
                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/60 hover:text-white transition-all duration-300 focus:outline-none hover:scale-105 active:scale-95"
                        title="Copy link"
                      >
                        {copiedProfileId === p.id ? (
                          <Check className="w-4 h-4" style={{ color: accent }} />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
                        title="Open page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Metadata chips — colored accents */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <div 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-300"
                      style={{ 
                        backgroundColor: `${accent}08`,
                        borderColor: `${accent}20`,
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${themeClass}`} />
                      <span className="text-white/60 font-medium truncate">{themeName}</span>
                    </div>

                    <div 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-300"
                      style={{ 
                        backgroundColor: `${accent}08`,
                        borderColor: `${accent}20`,
                      }}
                    >
                      <Link2 className="w-3 h-3 shrink-0" style={{ color: `${accent}80` }} />
                      <span className="text-white/60 font-medium">{linkCount} {linkCount === 1 ? 'link' : 'links'}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3.5 border-t" style={{ borderColor: `${accent}15` }}>
                    <button
                      onClick={(e) => handleDeleteProfile(p.id, p.slug, e)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 transition-all duration-300 disabled:opacity-20 disabled:pointer-events-none"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>

                    <div 
                      className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-300"
                      style={{ 
                        color: accent,
                        backgroundColor: `${accent}08`,
                        borderColor: `${accent}20`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${accent}15`;
                        e.currentTarget.style.borderColor = `${accent}35`;
                        e.currentTarget.style.boxShadow = `0 0 12px ${accent}25`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${accent}08`;
                        e.currentTarget.style.borderColor = `${accent}20`;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Configure <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="relative overflow-hidden w-full max-w-md rounded-[24px] border border-white/[0.08] backdrop-blur-2xl p-7 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6"
            style={{
              background: 'linear-gradient(135deg, rgba(25, 45, 35, 0.4) 0%, rgba(10, 20, 15, 0.95) 100%)',
              borderTop: '3px solid #22C55E'
            }}
          >
            {/* Ambient background glow orb */}
            <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-accent/10 blur-[50px] pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" /> Create Biolink Profile
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative z-10 space-y-5">
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Domain</label>
                <div className="relative">
                  <select
                    value={newProfileDomain}
                    onChange={(e) => setNewProfileDomain(e.target.value)}
                    className="w-full appearance-none px-4 py-3 rounded-xl bg-black/40 border border-border text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all pr-10"
                  >
                    {availableDomains.map((d: string) => (
                      <option key={d} value={d} className="bg-neutral-900">{d}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Profile Slug / Username</label>
                <input
                  type="text"
                  value={newProfileSlug}
                  onChange={(e) => setNewProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="e.g. business-card"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-border text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Display Name (optional)</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. John Doe / Brand"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-border text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-white/20"
                />
              </div>
            </div>

            <div className="relative z-10 flex gap-3 w-full pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl text-sm text-white/60 font-semibold bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all duration-300 active:scale-95"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProfile}
                disabled={actionLoading || !newProfileSlug}
                className="flex-1 py-3 btn-primary-glow text-sm font-bold flex items-center justify-center gap-2 active:scale-95"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Profile
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Upgrade Plan Modal */}
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        featureName={upgradeModal.feature}
        description={upgradeModal.description}
        planNeeded={upgradeModal.planNeeded}
      />
    </div>
  );
}
