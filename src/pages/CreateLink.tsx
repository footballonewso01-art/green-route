import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Smartphone, Clock, Shuffle, Loader2, Shield, Info, ExternalLink, Lock, Zap, CalendarRange } from "lucide-react";
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
import { X, Image as ImageIcon, Camera, Trash2, AlignLeft } from "lucide-react";
import Cropper, { Area, Point } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';

const generateRandomSlug = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function CreateLink() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; description: string; planNeeded?: "pro" | "agency" }>({
    open: false,
    feature: "",
    description: "",
  });

  const userPlan = (user as { plan?: string })?.plan || "creator";
  const canDeepLink = checkPlan(userPlan, "deep_links");

  const [form, setForm] = useState({
    title: "",
    url: "",
    slug: !id && !checkPlan((user as { plan?: string })?.plan || "creator", "custom_slug") ? generateRandomSlug() : "",
    show_on_profile: false,
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
    size: "regular", // "regular" | "large"
  });

  const [geoData, setGeoData] = useState<{ code: string; url: string }[]>([]);
  const [deviceData, setDeviceData] = useState<{ type: "Mobile" | "Desktop" | "Tablet"; url: string }[]>([]);
  const [splitUrls, setSplitUrls] = useState<string[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Background Image State
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);

  // Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (id) {
      const fetchLink = async () => {
        try {
          const record = await pb.collection('links').getOne(id);
          setForm({
            title: record.title || "",
            url: record.destination_url,
            slug: record.slug,
            show_on_profile: record.show_on_profile !== false,
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
            size: record.size || "regular",
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
          if (record.bg_image) {
            setBgImagePreview(pb.files.getUrl(record, record.bg_image));
          }
        } catch (error: unknown) {
          toast.error("Failed to fetch link details");
          navigate("/dashboard/links");
        } finally {
          setFetching(false);
        }
      };
      fetchLink();
    }
  }, [id, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const urlValidation = urlSchema.safeParse(form.url);
    if (!urlValidation.success) {
      toast.error(urlValidation.error.errors[0].message);
      return;
    }
    const validatedUrl = urlValidation.data;

    setLoading(true);
    try {
      const data = {
        title: form.title,
        destination_url: validatedUrl,
        slug: form.slug,
        show_on_profile: form.show_on_profile,
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
        size: form.size,
        user_id: user.id,
        active: true,
      };

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      if (bgImageFile) {
        formData.append('bg_image', bgImageFile);
      } else if (bgImagePreview === null && id) {
        formData.append('bg_image', ''); // Remove image if cleared
      }

      console.log("Submitting link data:", data);
      if (id) {
        await pb.collection('links').update(id, formData);
        toast.success("Link updated successfully");
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
        await pb.collection('links').create(formData);
        toast.success("Link created successfully");
      }
      navigate("/dashboard/links");
    } catch (error: unknown) {
      console.error("Link save error:", error);
      const err = error as { message?: string, data?: { data?: Record<string, { message: string }> } };
      let errorMsg = err.message || "Failed to save link";
      if (err.data && err.data.data) {
        // PocketBase validation errors are deeply nested in error.data.data
        const details = Object.entries(err.data.data)
          .map(([field, fieldErr]) => `${field}: ${fieldErr.message}`)
          .join(", ");
        if (details) errorMsg += ` (${details})`;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      if (!imageToCrop || !croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedImage) return;

      setBgImageFile(croppedImage);
      setBgImagePreview(URL.createObjectURL(croppedImage));
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image");
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
          {form.show_on_profile && (
            <div className="animate-fade-in">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Link Title (shown on profile)</label>
              <input required type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="My Awesome Project" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
            </div>
          )}

          <div className="relative">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Destination URL & Icon</label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  id="create-page-icon-btn"
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="h-[42px] px-3 bg-surface border border-border rounded-xl flex items-center justify-center hover:bg-surface-hover hover:border-accent/50 transition-colors"
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground bg-surface px-3 py-2.5 rounded-xl border border-border border-r-0 rounded-r-none">{window.location.host}/</span>
              <input
                required
                value={form.slug}
                onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                disabled={!checkPlan(userPlan, "custom_slug")}
                placeholder="my-link"
                className={`flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors rounded-l-none ${!checkPlan(userPlan, "custom_slug") ? "opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>
        </div>

        {/* Global Toggle */}
        <ToggleRow
          icon={ExternalLink}
          label="Show on Profile"
          description="Display this link on your public Link-in-Bio page"
          checked={form.show_on_profile}
          onChange={(v) => update("show_on_profile", v)}
          tooltip="If enabled, this link will appear on your public Link-in-Bio page. You MUST provide a Link Title if this is enabled."
        />

        {form.show_on_profile && (
          <div className="space-y-3 pt-2 animate-fade-in">
            <label className="text-sm font-medium text-foreground block">Display Size</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => update("size", "regular")}
                className={`py-[14px] px-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${form.size === "regular" ? "bg-accent/10 border-accent/50 text-accent" : "bg-surface border-border text-muted-foreground hover:border-accent/30"}`}
              >
                <div className="w-full h-8 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                  <div className="w-8 h-1.5 rounded-full bg-white/20" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Regular</span>
              </button>
              <button
                type="button"
                onClick={() => update("size", "large")}
                className={`py-[14px] px-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${form.size === "large" ? "bg-accent/10 border-accent/50 text-accent" : "bg-surface border-border text-muted-foreground hover:border-accent/30"}`}
              >
                <div className="w-full h-8 bg-white/5 rounded-lg border border-white/10 relative">
                  <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-white/20" />
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/20" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Large</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground italic px-1">Large boxes allow for a more prominent display and appear 3x taller.</p>

            {form.size === "large" && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-surface/50 space-y-3">
                <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-accent" /> Custom Background Image
                </label>
                <div className="flex items-center gap-4">
                  {bgImagePreview ? (
                    <div className="relative w-32 object-cover aspect-[10/5.4] rounded-lg overflow-hidden border border-border group">
                      <img src={bgImagePreview} alt="Background Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setBgImagePreview(null);
                            setBgImageFile(null);
                          }}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 aspect-[10/5.4] rounded-lg border border-dashed border-border bg-background flex flex-col items-center justify-center text-muted-foreground gap-1">
                      <ImageIcon className="w-5 h-5 opacity-50" />
                      <span className="text-[10px]">10:5.4</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="btn-primary-glow flex items-center justify-center gap-2 cursor-pointer text-sm py-2">
                      <Camera className="w-4 h-4" />
                      {bgImagePreview ? "Change Image" : "Upload Image"}
                      <input type="file" className="hidden" accept="image/*" onChange={handleBgImageChange} />
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-2">Max 5MB. Will be cropped to perfectly fit the large link box.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Power Features Grouping */}
        <div className="space-y-8 pt-4 border-t border-border">

          {/* Protection & Flow Group */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Protection & Flow</h3>

            <ToggleRow
              icon={Zap}
              label="Deeplinks (Beta)"
              description="Smart route from social apps to system browser"
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
              tooltip="Smart routing: Optimizes link delivery from social app browsers to system browser for best user experience (Beta)."
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
                label="A/B Split Test"
                description="Rotate multiple URLs"
                checked={form.ab_split}
                onChange={() => handleToggle("ab_split", "ab_testing", "A/B Split Test", "Randomly rotate traffic between several alternative URLs to test performance.")}
                tooltip="Randomly rotates traffic between several alternative URLs."
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
                <div className="pl-11 space-y-3 animate-fade-in">
                  {geoData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CountrySelect
                        value={d.code}
                        onChange={(code) => {
                          const next = [...geoData];
                          next[i].code = code;
                          setGeoData(next);
                        }}
                        excludeCodes={geoData.filter((_, j) => j !== i).map((g) => g.code).filter(Boolean)}
                      />
                      <input placeholder="Destination URL" value={d.url} onChange={(e) => {
                        const next = [...geoData];
                        next[i].url = e.target.value;
                        setGeoData(next);
                      }} className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs" />
                      <button
                        type="button"
                        onClick={() => setGeoData(geoData.filter((_, j) => j !== i))}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="Remove rule"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setGeoData([...geoData, { code: "", url: "" }])} className="text-[10px] text-accent hover:underline px-1">+ Add country rule</button>
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
                Pro Only
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

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-foreground mb-4">Crop Background Image</h3>

            <div className="relative w-full h-64 bg-background rounded-xl overflow-hidden mb-6">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={10 / 5.4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                showGrid={true}
              />
            </div>

            <div className="space-y-3 mb-6">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setImageToCrop(null)}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-surface-hover text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-black font-bold shadow-[0_0_20px_rgba(20,241,149,0.3)] transition-all"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
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
