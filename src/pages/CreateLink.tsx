import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Smartphone, Clock, Shuffle, Loader2, Shield, Info, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateLink() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);

  const [form, setForm] = useState({
    title: "",
    url: "",
    slug: "",
    show_on_profile: true,
    cloaking: false,
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    geo_targeting: false,
    device_targeting: false,
    ab_split: false,
    expire_at: "",
    safe_page_url: "",
    interstitial_enabled: false,
    mode: "redirect", // "redirect" | "landing" | "smart"
  });

  const [geoData, setGeoData] = useState<{ code: string; url: string }[]>([]);
  const [deviceData, setDeviceData] = useState<{ type: "Mobile" | "Desktop" | "Tablet"; url: string }[]>([]);
  const [splitUrls, setSplitUrls] = useState<string[]>([]);

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
          });

          if (record.geo_targeting) {
            setGeoData(Object.entries(record.geo_targeting).map(([code, url]) => ({ code, url: url as string })));
          }
          if (record.device_targeting) {
            setDeviceData(Object.entries(record.device_targeting).map(([type, url]) => ({ type: type as any, url: url as string })));
          }
          if (record.split_urls) {
            setSplitUrls(record.split_urls);
          }
        } catch (error: any) {
          toast.error("Failed to fetch link details");
          navigate("/dashboard/links");
        } finally {
          setFetching(false);
        }
      };
      fetchLink();
    }
  }, [id, navigate]);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const data = {
      title: form.title,
      destination_url: form.url,
      slug: form.slug,
      show_on_profile: form.show_on_profile,
      cloaking: form.cloaking,
      utm_source: form.utm_source,
      utm_medium: form.utm_medium,
      utm_campaign: form.utm_campaign,
      geo_targeting: form.geo_targeting ? Object.fromEntries(geoData.filter(d => d.code && d.url).map(d => [d.code, d.url])) : null,
      device_targeting: form.device_targeting ? Object.fromEntries(deviceData.filter(d => d.url).map(d => [d.type, d.url])) : null,
      ab_split: form.ab_split,
      split_urls: form.ab_split ? splitUrls.filter(Boolean) : null,
      expire_at: form.expire_at ? new Date(form.expire_at).toISOString() : null,
      safe_page_url: form.safe_page_url,
      interstitial_enabled: form.interstitial_enabled,
      mode: form.mode,
      user_id: user.id,
      active: true,
    };

    try {
      if (id) {
        await pb.collection('links').update(id, data);
        toast.success("Link updated successfully");
      } else {
        await pb.collection('links').create(data);
        toast.success("Link created successfully");
      }
      navigate("/dashboard/links");
    } catch (error: any) {
      toast.error(error.message || "Failed to save link");
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">{id ? "Edit Link" : "Create Link"}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{id ? "Update your smart link settings" : "Set up your new smart link"}</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-surface p-1 rounded-xl border border-border">
          {["redirect", "landing", "smart"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update("mode", m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${form.mode === m
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Title, URL & Slug */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Link Title (shown on profile)</label>
          <input required type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="My Awesome Project" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Destination URL</label>
          <input required type="url" value={form.url} onChange={(e) => update("url", e.target.value)} placeholder="https://example.com/your-page" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{window.location.host}/</span>
            <input required value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="my-link" className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          <ToggleRow
            icon={ExternalLink}
            label="Show on Profile"
            description="Display this link on your public Link-in-Bio page"
            checked={form.show_on_profile}
            onChange={(v) => update("show_on_profile", v)}
          />
          <ToggleRow
            icon={Shield}
            label="Mobile Protection"
            description="Interstitial screen to filter mobile bots"
            checked={form.interstitial_enabled}
            onChange={(v) => update("interstitial_enabled", v)}
            tooltip="Filters bots by requiring a screen tap before redirection. Essential for Instagram and TikTok traffic to prevent automated scanning."
          />
          {form.cloaking && (
            <div className="pl-11 animate-fade-in text-sm">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Safe Page URL (shown to bots)</label>
              <input type="url" value={form.safe_page_url} onChange={(e) => update("safe_page_url", e.target.value)} placeholder="https://google.com" className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-sm" />
            </div>
          )}

          <ToggleRow
            icon={Globe}
            label="Link Cloaking"
            description="Hide destination from bots"
            checked={form.cloaking}
            onChange={(v) => update("cloaking", v)}
            tooltip="Shows a safe page to bots while real users go to the destination. Protects your link from bans by ad platform moderators."
          />
          {form.cloaking && (
            <div className="pl-11 animate-fade-in text-sm">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Safe Page URL (shown to bots)</label>
              <input type="url" value={form.safe_page_url} onChange={(e) => update("safe_page_url", e.target.value)} placeholder="https://google.com" className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-sm" />
            </div>
          )}

          <ToggleRow
            icon={Globe}
            label="Geo Targeting"
            description="Route by country"
            checked={form.geo_targeting}
            onChange={(v) => update("geo_targeting", v)}
            tooltip="Redirect users to different URLs based on their country. Useful for international campaigns and localized offers."
          />
          {form.geo_targeting && (
            <div className="pl-11 space-y-3 animate-fade-in">
              {geoData.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="US" value={d.code} onChange={(e) => {
                    const next = [...geoData];
                    next[i].code = e.target.value.toUpperCase();
                    setGeoData(next);
                  }} className="w-16 px-3 py-2 rounded-lg bg-surface border border-border text-sm" />
                  <input placeholder="Destination URL" value={d.url} onChange={(e) => {
                    const next = [...geoData];
                    next[i].url = e.target.value;
                    setGeoData(next);
                  }} className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm" />
                </div>
              ))}
              <button type="button" onClick={() => setGeoData([...geoData, { code: "", url: "" }])} className="text-xs text-accent hover:underline">+ Add country rule</button>
            </div>
          )}

          <ToggleRow
            icon={Smartphone}
            label="Device Targeting"
            description="Route by device type"
            checked={form.device_targeting}
            onChange={(v) => update("device_targeting", v)}
            tooltip="Set custom destination URLs for Mobile, Desktop, or Tablet visitors. Ensures users see the version of your site optimized for their screen."
          />
          {form.device_targeting && (
            <div className="pl-11 space-y-3 animate-fade-in">
              {deviceData.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <select value={d.type} onChange={(e) => {
                    const next = [...deviceData];
                    next[i].type = e.target.value as any;
                    setDeviceData(next);
                  }} className="w-28 px-3 py-2 rounded-lg bg-surface border border-border text-sm">
                    <option value="Mobile">Mobile</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Tablet">Tablet</option>
                  </select>
                  <input placeholder="Destination URL" value={d.url} onChange={(e) => {
                    const next = [...deviceData];
                    next[i].url = e.target.value;
                    setDeviceData(next);
                  }} className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm" />
                </div>
              ))}
              <button type="button" onClick={() => setDeviceData([...deviceData, { type: "Mobile", url: "" }])} className="text-xs text-accent hover:underline">+ Add device rule</button>
            </div>
          )}

          <ToggleRow
            icon={Shuffle}
            label="A/B Split Test"
            description="Rotate multiple URLs"
            checked={form.ab_split}
            onChange={(v) => update("ab_split", v)}
            tooltip="Randomly rotates traffic between several alternative URLs to test which landing page or offer performs best."
          />
          {form.ab_split && (
            <div className="pl-11 space-y-3 animate-fade-in">
              {splitUrls.map((url, i) => (
                <input key={i} placeholder="Alternative URL" value={url} onChange={(e) => {
                  const next = [...splitUrls];
                  next[i] = e.target.value;
                  setSplitUrls(next);
                }} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm" />
              ))}
              <button type="button" onClick={() => setSplitUrls([...splitUrls, ""])} className="text-xs text-accent hover:underline">+ Add alternative URL</button>
            </div>
          )}
        </div>

        {/* UTM */}
        <div className="pt-2">
          <h3 className="text-sm font-medium text-foreground mb-3">UTM Parameters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.utm_source} onChange={(e) => update("utm_source", e.target.value)} placeholder="Source" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            <input value={form.utm_medium} onChange={(e) => update("utm_medium", e.target.value)} placeholder="Medium" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
            <input value={form.utm_campaign} onChange={(e) => update("utm_campaign", e.target.value)} placeholder="Campaign" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
          </div>
        </div>

        {/* Timer */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Activity Timer (optional)
          </label>
          <input type="datetime-local" value={form.expire_at} onChange={(e) => update("expire_at", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary-glow w-full mt-4 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {id ? "Update Link" : "Create Link"}
        </button>
      </form>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  tooltip
}: {
  icon: any;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-accent/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-foreground">{label}</div>
            {tooltip && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-accent transition-colors">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[10px] leading-relaxed p-2 bg-surface border-border text-foreground shadow-2xl">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <button type="button" onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${checked ? "bg-accent" : "bg-border"}`}>
        <div className={`w-5 h-5 rounded-full bg-foreground absolute top-0.5 transition-transform duration-200 ${checked ? "translate-x-5.5 left-0.5" : "left-0.5"}`} style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}
