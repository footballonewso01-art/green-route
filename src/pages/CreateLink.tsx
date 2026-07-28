import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Globe, Smartphone, Clock, Shuffle, Loader2, Shield, Info, Lock, Zap, CalendarRange, Check, UserRound, AlertTriangle, ChevronDown, X, Layers3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { pb } from "@/lib/pocketbase";
import { urlSchema } from "@/lib/validations";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { IconPicker } from '@/components/icons/IconPicker';
import { IconRenderer } from '@/components/icons/IconRenderer';
import { detectIconFromUrl } from '@/components/icons/detector';
import { checkPlan, canUseResource, PlanLimits } from '@/lib/plans';
import { UpgradeModal } from "@/components/UpgradeModal";
import { CountrySelect } from "@/components/CountrySelect";
import { getAvailableDomains } from '@/lib/siteConfig';
import { resolveNewLinkProfilePrefill } from '@/lib/linkProfileContext';
import { ProfileLinkRecord } from '@/lib/profileLinks';
import { getCountryByCode } from '@/lib/countries';
import {
  COUNTRY_TIER_PACKS,
  type CountryTierKey,
  getCountryTierKey,
  getCountryTierPack,
  isCountryTierKey,
} from '@/lib/countryTiers';
import { maskError } from '@/lib/utils';
import { isReservedPublicSlug } from "@/lib/systemRoutes";

const generateRandomSlug = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

type ProfileOption = {
  id: string;
  name?: string;
  slug: string;
  domain: string;
};

const PROFILE_SELECTOR_COLLAPSED_KEY = "links_profile_selector_collapsed";

export default function CreateLink() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedProfileId = id ? null : searchParams.get("profile");
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const availableDomains = useMemo(
    () => getAvailableDomains(import.meta.env.VITE_AVAILABLE_DOMAINS),
    [],
  );
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; description: string; planNeeded?: "pro" | "agency" }>({
    open: false,
    feature: "",
    description: "",
  });
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [expandedTierKey, setExpandedTierKey] = useState<CountryTierKey | null>(null);
  const [isProfileSelectorCollapsed, setIsProfileSelectorCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PROFILE_SELECTOR_COLLAPSED_KEY) === "true";
  });

  const userPlan = (user as { plan?: string })?.plan || "creator";
  const canDeepLink = checkPlan(userPlan, "deep_links");

  const [form, setForm] = useState({
    title: "",
    url: "",
    domain: availableDomains[0],
    slug: !id && !checkPlan((user as { plan?: string })?.plan || "creator", "custom_slug") ? generateRandomSlug() : "",
    cloaking: false,
    icon_type: "none" as "preset" | "emoji" | "custom" | "none",
    icon_value: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    geo_targeting: false,
    device_targeting: false,
    ab_split: false,
    start_at: "",
    expire_at: "",
    safe_page_url: "",
    interstitial_enabled: false,
    mode: "redirect", // "redirect" | "landing" | "smart" | "direct"
    fb_pixel: "",
    google_pixel: "",
    tiktok_pixel: "",
  });

  const selectedProfiles = profiles.filter((profile) => selectedProfileIds.includes(profile.id));

  const [geoData, setGeoData] = useState<{ code: string; url: string }[]>([]);
  const [deviceData, setDeviceData] = useState<{ type: "Mobile" | "Desktop" | "Tablet"; url: string }[]>([]);
  const [splitUrls, setSplitUrls] = useState<string[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(PROFILE_SELECTOR_COLLAPSED_KEY, String(isProfileSelectorCollapsed));
  }, [isProfileSelectorCollapsed]);

  useEffect(() => {
    if (user) {
      const fetchProfiles = async () => {
        try {
          const list = await pb.collection('public_profiles').getFullList<ProfileOption>({
            filter: `user_id = "${user.id}"`,
            sort: 'created'
          });
          setProfiles(list);
          if (!id) {
            const prefill = resolveNewLinkProfilePrefill(requestedProfileId, list);
            if (prefill) {
              setSelectedProfileIds(prefill.showOnProfile && prefill.profileId ? [prefill.profileId] : []);
              if (prefill.collapseSelector) setIsProfileSelectorCollapsed(true);
            }
          }
        } catch (err) {
          console.error("Failed to fetch profiles:", err);
        }
      };
      fetchProfiles();
    }
  }, [user, id, requestedProfileId]);

  useEffect(() => {
    if (id) {
      const fetchLink = async () => {
        try {
          const [record, assignments] = await Promise.all([
            pb.collection('links').getOne(id),
            user ? pb.collection('profile_links').getFullList<ProfileLinkRecord>({
              filter: `user_id="${user.id}" && link_id="${id}"`,
              requestKey: null,
            }) : Promise.resolve([]),
          ]);
          setForm({
            title: record.title || "",
            url: record.destination_url,
            domain: record.domain || availableDomains[0],
            slug: record.slug,
            cloaking: record.cloaking,
            icon_type: record.icon_type || "none",
            icon_value: record.icon_value || "",
            utm_source: record.utm_source || "",
            utm_medium: record.utm_medium || "",
            utm_campaign: record.utm_campaign || "",
            geo_targeting: !!record.geo_targeting,
            device_targeting: !!record.device_targeting,
            ab_split: record.ab_split,
            expire_at: record.expire_at ? new Date(record.expire_at).toISOString().slice(0, 16) : "",
            safe_page_url: record.safe_page_url || "",
            interstitial_enabled: !!record.interstitial_enabled,
            mode: record.mode || "redirect",
            start_at: record.start_at ? new Date(record.start_at).toISOString().slice(0, 16) : "",
            fb_pixel: record.fb_pixel || "",
            google_pixel: record.google_pixel || "",
            tiktok_pixel: record.tiktok_pixel || "",
          });

          if (record.geo_targeting) {
            setGeoData(Object.entries(record.geo_targeting).map(([code, url]) => ({ code, url: url as string })));
          }
          if (record.device_targeting) {
            setDeviceData(Object.entries(record.device_targeting).map(([type, url]) => ({ type: type as "Mobile" | "Desktop" | "Tablet", url: url as string })));
          }
          if (record.split_urls) {
            setSplitUrls(record.split_urls);
          }
          setSelectedProfileIds(assignments.filter(assignment => assignment.visible).map(assignment => assignment.profile_id));
        } catch (error: unknown) {
          toast.error("Failed to fetch link details");
          navigate("/dashboard/links");
        } finally {
          setFetching(false);
        }
      };
      fetchLink();
    }
  }, [availableDomains, id, navigate, user]);

  const update = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const handleToggle = (key: keyof typeof form, featureKey: keyof PlanLimits, label: string, desc: string) => {
    if (checkPlan(userPlan, featureKey)) {
      update(String(key), !form[key]);
    } else {
      setUpgradeModal({
        open: true,
        feature: label,
        description: desc,
        planNeeded: featureKey === "ab_testing" ? "agency" : "pro"
      });
    }
  };

  // Auto-detect icon based on URL input
  useEffect(() => {
    if (!id && form.url && (form.icon_type === "none" || !form.icon_type)) {
      const detected = detectIconFromUrl(form.url);
      if (detected) {
        setForm(prev => ({ ...prev, icon_type: "preset", icon_value: detected }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, id]);

  const syncProfileAssignments = async (linkId: string) => {
    if (!user) return;
    const assignments = await pb.collection('profile_links').getFullList<ProfileLinkRecord>({
      filter: `user_id="${user.id}"`,
      requestKey: null,
    });
    const currentForLink = assignments.filter(assignment => assignment.link_id === linkId);
    const selected = new Set(selectedProfileIds);

    await Promise.all(currentForLink
      .filter(assignment => !selected.has(assignment.profile_id))
      .map(assignment => pb.collection('profile_links').delete(assignment.id, { requestKey: null })));

    const existingProfileIds = new Set(currentForLink.map(assignment => assignment.profile_id));
    await Promise.all(selectedProfileIds
      .filter(profileId => !existingProfileIds.has(profileId))
      .map(profileId => pb.collection('profile_links').create({
        user_id: user.id,
        profile_id: profileId,
        link_id: linkId,
        order: assignments.filter(assignment => assignment.profile_id === profileId).length,
        visible: true,
        size: "regular",
      }, { requestKey: null })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.title.trim()) {
      toast.error("Link Title is required");
      return;
    }

    const urlValidation = urlSchema.safeParse(form.url);
    if (!urlValidation.success) {
      toast.error(urlValidation.error.errors[0].message);
      return;
    }
    const validatedUrl = urlValidation.data;

    const invalidGeoRule = form.geo_targeting
      ? geoData.find((rule) => rule.code && rule.url && !urlSchema.safeParse(rule.url).success)
      : null;
    if (invalidGeoRule) {
      const label = isCountryTierKey(invalidGeoRule.code)
        ? getCountryTierPack(invalidGeoRule.code)?.label
        : invalidGeoRule.code;
      toast.error(`${label || "Geo rule"} needs a valid destination URL.`);
      return;
    }

    if (form.slug) {
      if (form.slug.length > 64) {
        toast.error("Slug must be 64 characters or fewer");
        return;
      }
      if (isReservedPublicSlug(form.slug)) {
        toast.error("This address is reserved by Linktery. Please choose another slug.");
        return;
      }
      try {
        const [existingLinks, existingProfiles] = await Promise.all([
          pb.collection('links').getList(1, 1, { filter: `slug="${form.slug}" && id!="${id || ''}"` }),
          pb.collection('public_profiles').getList(1, 1, { filter: `slug="${form.slug}"` })
        ]);

        if (existingLinks.totalItems > 0) {
          toast.error("This slug is already in use by another link");
          return;
        }
        if (existingProfiles.totalItems > 0) {
          toast.error("This slug is already in use by a public profile");
          return;
        }
      } catch (err) {
        console.error("Slug validation error:", err);
      }
    }

    setLoading(true);
    try {
      const data = {
        title: form.title,
        destination_url: validatedUrl,
        domain: form.domain,
        slug: form.slug,
        cloaking: form.cloaking,
        icon_type: form.icon_type,
        icon_value: form.icon_value,
        utm_source: form.utm_source,
        utm_medium: form.utm_medium,
        utm_campaign: form.utm_campaign,
        geo_targeting: form.geo_targeting ? Object.fromEntries(geoData.filter(d => d.code && d.url).map(d => [d.code, d.url])) : null,
        device_targeting: form.device_targeting ? Object.fromEntries(deviceData.filter(d => d.url).map(d => [d.type, d.url])) : null,
        ab_split: form.ab_split,
        split_urls: form.ab_split ? splitUrls.filter(Boolean) : null,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        expire_at: form.expire_at ? new Date(form.expire_at).toISOString() : null,
        safe_page_url: form.safe_page_url,
        interstitial_enabled: form.interstitial_enabled,
        mode: form.mode,
        fb_pixel: form.fb_pixel,
        google_pixel: form.google_pixel,
        tiktok_pixel: form.tiktok_pixel,
        user_id: user.id,
        active: true,
      };

      const formData = new FormData();
      // JSON fields that need "null" string instead of empty string to properly clear in PocketBase
      const jsonFields = new Set(['geo_targeting', 'device_targeting', 'split_urls']);
      
      Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          // For JSON fields, send "null" so PocketBase clears the field properly
          // instead of storing empty string which causes validation issues
          formData.append(key, jsonFields.has(key) ? 'null' : '');
          return;
        }

        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      console.log("Submitting link data:", data);
      let savedLinkId = id;
      if (id) {
        await pb.collection('links').update(id, formData);
      } else {
        const currentLinks = await pb.collection('links').getList(1, 1, { filter: `user_id="${user.id}"` });
        if (!canUseResource(userPlan, "links", currentLinks.totalItems)) {
          setUpgradeModal({
            open: true,
            feature: "Additional Links",
            description: "You've reached your plan limit. Upgrade to create more smart links.",
          });
          setLoading(false);
          return;
        }
        const created = await pb.collection('links').create(formData);
        savedLinkId = created.id;
      }
      if (savedLinkId) await syncProfileAssignments(savedLinkId);
      toast.success(id ? "Link updated successfully" : "Link created successfully");
      navigate("/dashboard/links");
    } catch (error: unknown) {
      console.error("Link save error:", error);
      toast.error(maskError(error, "We couldn't save this link. Check its settings and try again."));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{id ? "Edit Link" : "Create Link"}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{id ? "Update your smart link settings" : "Set up your new smart link"}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
        {/* Title, URL & Icon */}
        <div className="space-y-4">
          <div className="animate-fade-in">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Link Title</label>
            <input required type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="My Awesome Project" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Destination URL & Icon</label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  id="create-page-icon-btn"
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-[42px] h-[42px] shrink-0 overflow-hidden bg-surface border border-border rounded-xl flex items-center justify-center hover:bg-surface-hover hover:border-accent/50 transition-colors"
                >
                  <IconRenderer type={form.icon_type} value={form.icon_value} className="w-5 h-5 text-muted-foreground" />
                </button>
                {showIconPicker && (
                  <IconPicker
                    currentType={form.icon_type}
                    currentValue={form.icon_value}
                    anchorRef={{ current: document.getElementById("create-page-icon-btn") } as React.RefObject<HTMLElement>}
                    onChange={(type, value) => {
                      update("icon_type", type);
                      update("icon_value", value);
                    }}
                    onClose={() => setShowIconPicker(false)}
                  />
                )}
              </div>
              <input required type="url" value={form.url} onChange={(e) => update("url", e.target.value)} placeholder="https://example.com/your-page" className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3 mb-2.5">
              <div>
                <label className="text-sm font-medium text-foreground block">Choose Domain</label>
                <p className="text-xs text-muted-foreground mt-0.5">Select the public address for this link.</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent/80">{availableDomains.length} available</span>
            </div>
            <div role="radiogroup" aria-label="Choose link domain" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              {availableDomains.map((domainOption: string, index: number) => {
                const selected = form.domain === domainOption;
                return (
                  <button
                    key={domainOption}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update("domain", domainOption)}
                    className={`group relative min-w-0 rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                      selected
                        ? "border-accent/60 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_12px_32px_rgba(0,0,0,0.18)]"
                        : "border-border/80 bg-surface/70 hover:border-accent/30 hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${selected ? "border-accent/30 bg-accent/15 text-accent" : "border-border bg-background/40 text-muted-foreground group-hover:text-foreground"}`}>
                        <Globe className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">{domainOption}</span>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${index === 0 ? "bg-accent/10 text-accent" : "bg-white/5 text-muted-foreground"}`}>
                            {index === 0 ? "Primary" : "Alias"}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {index === 0 ? "Main Linktery address" : "Alternate branded address"}
                        </span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${selected ? "border-accent bg-accent text-black" : "border-border text-transparent group-hover:border-accent/30"}`}>
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground block">Custom Slug</label>
              {!checkPlan(userPlan, "custom_slug") && (
                <div
                  onClick={() => setUpgradeModal({
                    open: true,
                    feature: "Custom Slugs",
                    description: "Create memorable, branded links (e.g. /my-promo) with the Agency plan.",
                    planNeeded: "agency"
                  })}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-wider cursor-pointer hover:bg-accent/20 transition-colors"
                >
                  <Lock className="w-2.5 h-2.5" />
                  Agency Only
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2">
              <span className="text-[12px] sm:text-sm text-muted-foreground bg-surface px-3 py-2 sm:py-2.5 rounded-t-xl sm:rounded-xl border border-border sm:border-r-0 sm:rounded-r-none whitespace-nowrap overflow-hidden text-ellipsis">
                {form.domain}/
              </span>
              <input
                required
                value={form.slug}
                onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                maxLength={64}
                disabled={!checkPlan(userPlan, "custom_slug")}
                placeholder="my-link"
                className={`flex-1 px-4 py-2 sm:py-2.5 rounded-b-xl sm:rounded-xl bg-surface border border-border sm:border-l-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors sm:rounded-l-none ${!checkPlan(userPlan, "custom_slug") ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>
        </div>

        {/* Public Profile composition. Card presentation is customized in Profile. */}
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface/40">
              <button
                type="button"
                onClick={() => setIsProfileSelectorCollapsed((current) => !current)}
                aria-expanded={!isProfileSelectorCollapsed}
                aria-controls="link-profile-selector"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface/70"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">Shown on Public Profiles</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {selectedProfiles.length > 0
                      ? `${selectedProfiles.length} profile${selectedProfiles.length === 1 ? "" : "s"} selected`
                      : "Optional. Choose one or several placements."}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isProfileSelectorCollapsed ? "" : "rotate-180"}`} />
              </button>

              {!isProfileSelectorCollapsed && (
                <div id="link-profile-selector" className="border-t border-border/70 p-3.5 animate-fade-in">
                  {profiles.length > 0 && (
                    <div aria-label="Select public profiles" className="max-h-64 space-y-2 overflow-y-auto pr-1 no-scrollbar">
                      {profiles.map((profileOption) => {
                        const selected = selectedProfileIds.includes(profileOption.id);
                        const displayName = profileOption.name || `@${profileOption.slug}`;
                        const profileDomain = profileOption.domain || availableDomains[0];
                        return (
                          <button
                            key={profileOption.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setSelectedProfileIds(current => selected
                              ? current.filter(profileId => profileId !== profileOption.id)
                              : [...current, profileOption.id])}
                            className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                              selected
                                ? "border-accent/60 bg-accent/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
                                : "border-border/80 bg-surface/70 hover:border-accent/30 hover:bg-surface-hover"
                            }`}
                          >
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black uppercase ${selected ? "border-accent/30 bg-accent/15 text-accent" : "border-border bg-background/40 text-muted-foreground"}`}>
                              {displayName.charAt(0) || <UserRound className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
                              <span className="mt-0.5 block truncate text-xs font-sans text-muted-foreground">{profileDomain}/{profileOption.slug}</span>
                            </span>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${selected ? "border-accent bg-accent text-black" : "border-border text-transparent group-hover:border-accent/30"}`}>
                              <Check className="h-3 w-3" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {profiles.length === 0 && (
                    <p className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-xs leading-relaxed text-amber-200/70">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      You do not have any Public Profiles yet. The Link can still be created and added later.
                    </p>
                  )}
                </div>
              )}
              <p className="border-t border-border/70 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
                Card size, title override and background image are customized separately inside each Public Profile.
              </p>
            </div>

        {/* Power Features Grouping */}
        <div className="space-y-8 pt-4 border-t border-border">

          {/* Protection & Flow Group */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Protection & Flow</h3>

            <ToggleRow
              icon={Zap}
              label="Deeplink"
              description="Safe browser handoff for social app visitors"
              checked={form.mode === "direct"}
              onChange={() => {
                if (checkPlan(userPlan, "deep_links")) {
                  update("mode", form.mode === "direct" ? "redirect" : "direct");
                } else {
                  setUpgradeModal({
                    open: true,
                    feature: "Deeplinks",
                    description: "Optimize link routing through social apps for maximum conversion. Available on Pro.",
                    planNeeded: "pro"
                  });
                }
              }}
              tooltip="Shows a one-tap browser handoff in Instagram, TikTok, and Facebook without automatic retry loops."
              disabled={!checkPlan(userPlan, "deep_links")}
              lockedTooltip="Available on Creator Pro"
            />

            <ToggleRow
              icon={Shield}
              label="Security Check (Interstitial)"
              description="Verification step before redirect"
              checked={form.interstitial_enabled}
              onChange={() => update("interstitial_enabled", !form.interstitial_enabled)}
              tooltip="Shows a 'Security Check' page where users must tap once to continue. Helps avoid bot detection."
            />

            <div className="space-y-3">
              <ToggleRow
                icon={Shield}
                label="Link Optimization"
                description="Secure and optimize destination traffic"
                checked={form.cloaking}
                onChange={() => handleToggle("cloaking", "cloaking", "Link Optimization", "Protect your destination URL and filter traffic quality.")}
                tooltip="Cleans and optimizes incoming traffic. Protects your destination link and increases quality of redirects."
                disabled={!checkPlan(userPlan, "cloaking")}
                lockedTooltip="Available on Creator Pro"
              />
              {form.cloaking && (
                <div className="pl-11 animate-fade-in">
                  <input type="url" value={form.safe_page_url} onChange={(e) => update("safe_page_url", e.target.value)} placeholder="Safe Page URL (e.g. https://google.com)" className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-xs" />
                </div>
              )}
            </div>
          </div>

          {/* Advanced Routing Group */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Advanced Routing</h3>

            <div className="space-y-3">
              <ToggleRow
                icon={Shuffle}
                label="A/B Traffic Splitter"
                description="Rotate and split traffic evenly"
                checked={form.ab_split}
                onChange={() => handleToggle("ab_split", "ab_testing", "A/B Traffic Splitter", "Smartly rotate and distribute your traffic evenly across multiple destination URLs. Perfect for affiliate testing or load balancing.")}
                tooltip="Evenly rotates traffic between several alternative URLs. Ideal for testing which offer converts better."
                disabled={!checkPlan(userPlan, "ab_testing")}
                lockedTooltip="Available on Agency Plan"
              />
              {form.ab_split && (
                <div className="pl-11 space-y-3 animate-fade-in">
                  {splitUrls.map((url, i) => (
                    <input key={i} placeholder="Alternative URL" value={url} onChange={(e) => {
                      const next = [...splitUrls];
                      next[i] = e.target.value;
                      setSplitUrls(next);
                    }} className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-xs" />
                  ))}
                  <button type="button" onClick={() => setSplitUrls([...splitUrls, ""])} className="text-[10px] text-accent hover:underline px-1">+ Add alternative URL</button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <ToggleRow
                icon={Globe}
                label="Geo Targeting"
                description="Route by visitor country"
                checked={form.geo_targeting}
                onChange={() => handleToggle("geo_targeting", "geo_targeting", "Geo Targeting", "Redirect users to different URLs based on their country.")}
                tooltip="Redirect users based on their country. Example: US users go to one link, UK to another."
                disabled={!checkPlan(userPlan, "geo_targeting")}
                lockedTooltip="Available on Creator Pro"
              />
              {form.geo_targeting && (
                <div className="pl-0 sm:pl-11 space-y-4 animate-fade-in">
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-3.5">
                    <div className="mb-3 flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-lg border border-accent/20 bg-accent/10 p-1.5 text-accent">
                        <Layers3 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Country packs</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                          Linktery marketing presets. Tier definitions can vary between ad networks.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {COUNTRY_TIER_PACKS.map((pack) => {
                        const isAdded = geoData.some((rule) => rule.code === pack.key);
                        const isExpanded = expandedTierKey === pack.key;
                        return (
                          <div
                            key={pack.key}
                            className={`rounded-xl border p-3 text-left transition-all ${isAdded
                              ? "border-accent/50 bg-accent/10 shadow-[0_0_0_1px_rgba(52,211,153,0.08)]"
                              : "border-border/60 bg-surface/50 hover:border-accent/30 hover:bg-surface"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-bold ${isAdded ? "text-accent" : "text-foreground"}`}>{pack.label}</span>
                              <span className="rounded-md bg-background/70 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                                {pack.codes.length}
                              </span>
                            </div>
                            <p className="mt-1 text-[9px] leading-snug text-muted-foreground">{pack.description}</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAdded) {
                                    setGeoData((current) => current.filter((rule) => rule.code !== pack.key));
                                  } else {
                                    setGeoData((current) => [...current, { code: pack.key, url: "" }]);
                                  }
                                }}
                                aria-pressed={isAdded}
                                className={`rounded-lg px-2 py-1 text-[9px] font-bold transition-colors ${isAdded
                                  ? "bg-accent/15 text-accent hover:bg-accent/20"
                                  : "bg-background/70 text-foreground hover:bg-accent/10 hover:text-accent"
                                  }`}
                              >
                                {isAdded ? "Remove pack" : "Add pack"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedTierKey(isExpanded ? null : pack.key)}
                                aria-expanded={isExpanded}
                                aria-controls={`country-tier-${pack.key}`}
                                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[9px] font-semibold text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                              >
                                Countries
                                <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {expandedTierKey && (() => {
                      const expandedPack = getCountryTierPack(expandedTierKey);
                      if (!expandedPack) return null;

                      return (
                        <div
                          id={`country-tier-${expandedPack.key}`}
                          className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-surface/45"
                        >
                          <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
                            <div>
                              <p className="text-[11px] font-semibold text-foreground">Countries in {expandedPack.label}</p>
                              <p className="mt-0.5 text-[9px] text-muted-foreground">{expandedPack.codes.length} countries in this Linktery preset</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedTierKey(null)}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
                              aria-label={`Close ${expandedPack.label} country list`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid max-h-52 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
                            {expandedPack.codes.map((code) => {
                              const country = getCountryByCode(code);
                              return (
                                <div key={code} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-foreground/85 hover:bg-background/55">
                                  <span className="text-sm" aria-hidden="true">{country?.flag}</span>
                                  <span className="min-w-0 flex-1 truncate">{country?.name || code}</span>
                                  <span className="font-mono text-[9px] text-muted-foreground">{code}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {geoData.map((d, i) => {
                    const individualTier = d.code && !isCountryTierKey(d.code) ? getCountryTierKey(d.code) : null;
                    const overridesActiveTier = individualTier
                      ? geoData.some((rule) => rule.code === individualTier)
                      : false;

                    return (
                      <div key={`${d.code || "country"}-${i}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {isCountryTierKey(d.code) ? (
                          <div className="flex h-10 min-w-[190px] items-center justify-between rounded-xl border border-accent/25 bg-accent/5 px-3">
                            <div>
                              <p className="text-[11px] font-semibold text-foreground">{getCountryTierPack(d.code)?.label}</p>
                              <p className="text-[9px] text-muted-foreground">{getCountryTierPack(d.code)?.codes.length} countries</p>
                            </div>
                            <Layers3 className="h-3.5 w-3.5 text-accent" />
                          </div>
                        ) : (
                          <div className="min-w-[190px]">
                            <CountrySelect
                              value={d.code}
                              onChange={(code) => {
                                const next = [...geoData];
                                next[i].code = code;
                                setGeoData(next);
                              }}
                              excludeCodes={geoData.filter((_, j) => j !== i).map((g) => g.code).filter((code) => code && !isCountryTierKey(code))}
                            />
                            {overridesActiveTier && individualTier && (
                              <p className="mt-1 px-1 text-[9px] font-semibold text-amber-400/90">
                                Overrides {getCountryTierPack(individualTier)?.label}
                              </p>
                            )}
                          </div>
                        )}
                        <input placeholder="Destination URL" value={d.url} onChange={(e) => {
                          const next = [...geoData];
                          next[i].url = e.target.value;
                          setGeoData(next);
                        }} className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-xs outline-none transition-colors focus:border-accent/60" />
                        <button
                          type="button"
                          onClick={() => setGeoData(geoData.filter((_, j) => j !== i))}
                          className="self-end rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:self-auto"
                          title="Remove rule"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setGeoData([...geoData, { code: "", url: "" }])} className="rounded-lg px-1 py-1 text-[10px] font-semibold text-accent hover:text-accent/80">+ Add individual country</button>
                    {geoData.some((rule) => isCountryTierKey(rule.code)) && geoData.some((rule) => rule.code && !isCountryTierKey(rule.code)) && (
                      <p className="text-right text-[9px] text-muted-foreground">Individual countries override their tier.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <ToggleRow
                icon={Smartphone}
                label="Device Targeting"
                description="Route by device type"
                checked={form.device_targeting}
                onChange={() => handleToggle("device_targeting", "device_targeting", "Device Targeting", "Set custom destination URLs for different devices.")}
                tooltip="Set custom destination URLs for Mobile, Desktop, or Tablet visitors."
                disabled={!checkPlan(userPlan, "device_targeting")}
                lockedTooltip="Free on all plans"
              />
              {form.device_targeting && (
                <div className="pl-11 space-y-3 animate-fade-in">
                  {deviceData.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <select value={d.type} onChange={(e) => {
                        const next = [...deviceData];
                        next[i].type = e.target.value as "Mobile" | "Desktop" | "Tablet";
                        setDeviceData(next);
                      }} className="w-28 px-3 py-2 rounded-lg bg-surface border border-border text-xs">
                        <option value="Mobile">Mobile</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Tablet">Tablet</option>
                      </select>
                      <input placeholder="Destination URL" value={d.url} onChange={(e) => {
                        const next = [...deviceData];
                        next[i].url = e.target.value;
                        setDeviceData(next);
                      }} className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs" />
                    </div>
                  ))}
                  <button type="button" onClick={() => setDeviceData([...deviceData, { type: "Mobile", url: "" }])} className="text-[10px] text-accent hover:underline px-1">+ Add device rule</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracking Pixels */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground italic flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Tracking Pixels
            </h3>
            {!checkPlan(userPlan, "pixels") && (
              <div
                onClick={() => setUpgradeModal({
                  open: true,
                  feature: "Tracking Pixels",
                  description: "Retarget your audience by adding Meta, Google, and TikTok pixels to your links."
                })}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-wider cursor-pointer"
              >
                <Lock className="w-2.5 h-2.5" />
                Agency Only
              </div>
            )}
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${!checkPlan(userPlan, "pixels") ? "opacity-50 pointer-events-none" : ""}`}>
            <input value={form.fb_pixel} onChange={(e) => update("fb_pixel", e.target.value)} placeholder="Meta Pixel ID" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            <input value={form.google_pixel} onChange={(e) => update("google_pixel", e.target.value)} placeholder="Google tag (GT-)" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            <input value={form.tiktok_pixel} onChange={(e) => update("tiktok_pixel", e.target.value)} placeholder="TikTok Pixel ID" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
          </div>
          {!checkPlan(userPlan, "pixels") && (
            <p className="text-[10px] text-muted-foreground mt-2 italic">Pixels are standard for professional marketers. Upgrade to start retargeting.</p>
          )}
        </div>

        {/* UTM Parameters */}
        <div className="pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-foreground mb-4">UTM Parameters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.utm_source} onChange={(e) => update("utm_source", e.target.value)} placeholder="Source" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            <input value={form.utm_medium} onChange={(e) => update("utm_medium", e.target.value)} placeholder="Medium" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            <input value={form.utm_campaign} onChange={(e) => update("utm_campaign", e.target.value)} placeholder="Campaign" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
          </div>
        </div>

        {/* Link Scheduling */}
        <div className="pt-6 border-t border-border">
          <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-accent" /> Link Scheduling (optional)
          </label>
          <p className="text-xs text-muted-foreground mb-4">Set when this link becomes active and when it expires. Leave empty for always-on.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Start Date</label>
              <input type="datetime-local" value={form.start_at} onChange={(e) => update("start_at", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">End Date</label>
              <input type="datetime-local" value={form.expire_at} onChange={(e) => update("expire_at", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            </div>
          </div>
          {(form.start_at || form.expire_at) && (
            <div className="mt-3 p-3 rounded-xl bg-accent/5 border border-accent/10 text-xs text-muted-foreground">
              <span className="text-accent font-medium">Schedule: </span>
              {form.start_at ? `Active from ${new Date(form.start_at).toLocaleString()}` : "Starts immediately"}
              {form.expire_at ? ` until ${new Date(form.expire_at).toLocaleString()}` : ", no expiration"}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary-glow w-full mt-4 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {id ? "Update Link" : "Create Link"}
        </button>
      </form>

      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
        featureName={upgradeModal.feature}
        description={upgradeModal.description}
        planNeeded={upgradeModal.planNeeded}
      />
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  tooltip,
  disabled,
  lockedTooltip
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
  disabled?: boolean;
  lockedTooltip?: string;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${disabled ? 'opacity-60 border-border bg-background cursor-pointer' : 'border-border hover:border-accent/20 cursor-pointer'}`} onClick={() => onChange(!checked)}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${disabled ? 'bg-muted/50' : 'bg-accent/10'}`}>
          <Icon className={`w-4 h-4 ${disabled ? 'text-muted-foreground' : 'text-accent'}`} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-foreground">{label}</div>
            {tooltip && !disabled && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-accent transition-colors" onClick={(e) => e.stopPropagation()}>
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[10px] leading-relaxed p-2 bg-surface border-border text-foreground shadow-2xl">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {disabled && lockedTooltip && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground ml-1" onClick={(e) => e.stopPropagation()}>
                    PRO
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[10px] leading-relaxed p-2 bg-surface border-border text-foreground shadow-2xl">
                  <p>{lockedTooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <button type="button" disabled={disabled} className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${checked ? "bg-accent" : "bg-border"} ${disabled ? "opacity-50 cursor-not-allowed cursor-pointer pointer-events-none" : ""}`}>
        <div className={`w-5 h-5 rounded-full bg-foreground absolute top-0.5 transition-transform duration-200 ${checked ? "translate-x-5.5 left-0.5" : "left-0.5"}`} style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}
