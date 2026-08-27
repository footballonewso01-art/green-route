import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { BarChart3, Globe, Smartphone, Monitor, TabletSmartphone, Loader2, Lock, Clock, Eye, MousePointerClick, Users, Gauge } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { checkPlan } from "@/lib/plans";
import WorldTrafficMap, { type CountryTrafficDatum } from "@/components/analytics/WorldTrafficMap";
import AnalyticsStatBadge from "@/components/analytics/AnalyticsStatBadge";
import ProfileScopeSelect, {
  ALL_PROFILES_SCOPE,
  type AnalyticsProfileOption,
} from "@/components/analytics/ProfileScopeSelect";
import { getCountryDisplayName, normalizeCountryCode } from "@/lib/countryFormatting";
import { refreshOnTabReturn } from "@/lib/refreshOnTabReturn";

interface ClickRecord {
  id: string;
  country: string;
  device: string;
  os: string;
  browser: string;
  referrer: string;
  is_unique: boolean;
  created: string;
  expand?: { link_id?: { title?: string; slug?: string } };
}

interface CountryStat extends CountryTrafficDatum {
  name: string;
  pct: number;
}

interface ProfileCardStat {
  profileLinkId: string;
  linkId: string;
  title: string;
  clicks: number;
  ctr: number;
  profileId?: string;
  profileName?: string;
  profileSlug?: string;
}

interface TrendDatum {
  date: string;
  clicks: number;
  cardClicks?: number;
}

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const linkId = searchParams.get("link");
  const profileScope = searchParams.get("profile");
  const isProfileMode = profileScope !== null;
  const isAllProfiles = profileScope === ALL_PROFILES_SCOPE || profileScope === "";
  const profileId = isProfileMode && !isAllProfiles ? profileScope : null;
  const { user } = useAuth();
  const analyticsScopeKey = `${user?.id || "guest"}|${isProfileMode
    ? `profiles:${profileScope || ALL_PROFILES_SCOPE}`
    : `links:${linkId || "all"}`}`;
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clicksCount, setClicksCount] = useState(0);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [profileCardClicks, setProfileCardClicks] = useState(0);
  const [profileCtr, setProfileCtr] = useState(0);
  const [profileOptions, setProfileOptions] = useState<AnalyticsProfileOption[]>([]);
  const [profileOptionsLoaded, setProfileOptionsLoaded] = useState(false);
  const [profileOptionsFailed, setProfileOptionsFailed] = useState(false);
  const [profileCards, setProfileCards] = useState<ProfileCardStat[]>([]);
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [countryMap, setCountryMap] = useState<CountryTrafficDatum[]>([]);
  const [referrers, setReferrers] = useState<{ name: string; clicks: number; pct: number }[]>([]);
  const [devices, setDevices] = useState<{ name: string; value: number; color: string }[]>([]);
  const [browserData, setBrowserData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [osData, setOsData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trendData, setTrendData] = useState<TrendDatum[]>([]);
  const [recentActivities, setRecentActivities] = useState<ClickRecord[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)));
  const loadedOnceRef = useRef(false);
  const [resolvedAnalyticsScope, setResolvedAnalyticsScope] = useState<string | null>(null);

  const userPlan = (user as { plan?: string })?.plan || "creator";
  const canUseAnalytics = checkPlan(userPlan, "analytics");
  const profileScopeNeedsNormalization = isProfileMode
    && profileOptionsLoaded
    && !profileOptionsFailed
    && !isAllProfiles
    && !profileOptions.some((profile) => profile.id === profileScope);

  useEffect(() => {
    if (!canUseAnalytics || !user?.id) {
      setProfileOptions([]);
      setProfileOptionsLoaded(false);
      setProfileOptionsFailed(false);
      return;
    }
    let active = true;
    setProfileOptionsLoaded(false);
    setProfileOptionsFailed(false);
    pb.collection("public_profiles").getFullList<AnalyticsProfileOption>({
      filter: `user_id="${user.id}"`,
      sort: "created",
      fields: "id,name,slug",
      requestKey: "analytics-profile-options",
    }).then((profiles) => {
      if (active) setProfileOptions(profiles);
    }).catch((error: unknown) => {
      if (!(error as { isAbort?: boolean }).isAbort) {
        console.error("Profile analytics options fetch failed:", error);
        if (active) setProfileOptionsFailed(true);
      }
    }).finally(() => {
      if (active) setProfileOptionsLoaded(true);
    });
    return () => {
      active = false;
      pb.cancelRequest("analytics-profile-options");
    };
  }, [canUseAnalytics, user?.id]);

  useEffect(() => {
    if (!isProfileMode || !profileOptionsLoaded || profileOptionsFailed) return;
    if (!profileScopeNeedsNormalization && profileScope !== "") return;

    const next = new URLSearchParams(searchParams);
    next.delete("link");
    next.set("profile", ALL_PROFILES_SCOPE);
    setSearchParams(next, { replace: true });
  }, [isProfileMode, profileOptionsFailed, profileOptionsLoaded, profileScope, profileScopeNeedsNormalization, searchParams, setSearchParams]);

  useEffect(() => {
    if (!canUseAnalytics || !user?.id) return;
    if (isProfileMode && !profileOptionsLoaded) return;
    if (profileScopeNeedsNormalization) return;
    let active = true;
    let inFlight = false;
    let pendingReturnRefresh = false;
    let hasData = false;
    const requestKey = "analytics-stats";
    const fetchAnalytics = async (refresh = false) => {
      if (!active) return;
      if (inFlight) {
        pendingReturnRefresh ||= refresh;
        return;
      }
      inFlight = true;
      pendingReturnRefresh = false;
      if (loadedOnceRef.current) setRefreshing(true);
      else setLoading(true);
      try {
        // === SERVER-SIDE SQL AGGREGATION ===
        // Single API call returns pre-aggregated data (~2KB) instead of thousands of raw records.
        const queryParams = new URLSearchParams({ period });
        if (refresh) queryParams.set("refresh", "1");
        if (isProfileMode) queryParams.set("profileId", profileScope || ALL_PROFILES_SCOPE);
        else if (linkId) queryParams.set("linkId", linkId);

        const analyticsPath = isProfileMode ? "/api/analytics/profile-stats" : "/api/analytics/stats";
        const stats = await pb.send(`${analyticsPath}?${queryParams.toString()}`, {
          method: "GET",
          requestKey,
          cache: "no-store",
        });
        if (!active) return;

        // 1. Totals (already computed by SQL)
        setClicksCount(isProfileMode ? Number(stats.views || 0) : Number(stats.total || 0));
        setUniqueCount(isProfileMode ? Number(stats.uniqueViews || 0) : Number(stats.unique || 0));
        setProfileCardClicks(isProfileMode ? Number(stats.cardClicks || 0) : 0);
        setProfileCtr(isProfileMode ? Number(stats.ctr || 0) : 0);
        setProfileCards(isProfileMode ? (stats.cards || []) : []);

        // 2. Countries. Keep ISO codes for the world map and derive names only for display.
        const topCountries = (stats.countries || []).map((country: { name: string; clicks?: number; views?: number; pct: number }) => {
          const code = normalizeCountryCode(country.name) || "";
          return {
            code,
            name: getCountryDisplayName(country.name),
            clicks: Number(country.clicks ?? country.views ?? 0),
            pct: Number(country.pct || 0),
          };
        });
        setCountries(topCountries);

        // Fall back to the legacy top-country response while backend and frontend
        // versions roll out independently.
        const mapCountries = (stats.countryMap || stats.countries || [])
          .map((country: { code?: string; name?: string; clicks?: number; views?: number; pct?: number }) => ({
            code: normalizeCountryCode(country.code || country.name) || "",
            clicks: Number(country.clicks ?? country.views ?? 0),
            pct: Number(country.pct || 0),
          }))
          .filter((country: CountryTrafficDatum) => Boolean(country.code) && country.clicks > 0);
        setCountryMap(mapCountries);

        // 3. Referrers (already sorted + with pct from server)
        setReferrers((stats.referrers || []).map((item: { name: string; clicks?: number; value?: number; pct?: number }) => {
          const amount = Number(item.clicks ?? item.value ?? 0);
          const total = isProfileMode ? Number(stats.views || 0) : Number(stats.total || 0);
          return {
            name: item.name,
            clicks: amount,
            pct: item.pct == null ? (total > 0 ? Math.round((amount / total) * 100) : 0) : Number(item.pct),
          };
        }));

        // 4. Devices (map server data to colored chart format)
        const deviceMap: Record<string, number> = {};
        (stats.devices || []).forEach((d: { name: string; value: number }) => { deviceMap[d.name] = d.value; });
        setDevices([
          { name: "Mobile", value: deviceMap["Mobile"] || 0, color: "hsl(153, 68%, 55%)" },
          { name: "Desktop", value: deviceMap["Desktop"] || 0, color: "hsl(155, 70%, 14%)" },
          { name: "Tablet", value: deviceMap["Tablet"] || 0, color: "hsl(155, 25%, 35%)" },
        ]);

        // 5. Browsers (add colors)
        const browserColors = ["hsl(153, 68%, 55%)", "hsl(155, 35%, 25%)", "hsl(155, 20%, 40%)"];
        setBrowserData((stats.browsers || []).map((b: { name: string; value: number }, i: number) => ({
          ...b, color: browserColors[i] || browserColors[2]
        })));

        // 6. OS (add colors)
        setOsData((stats.os || []).map((o: { name: string; value: number }, i: number) => ({
          ...o, color: browserColors[i] || browserColors[2]
        })));

        // 7. Trend — fill gaps for days without clicks so the chart line is continuous
        const trendFromServer: { date: string; clicks?: number; views?: number; cardClicks?: number }[] = stats.trend || [];
        const trendMap: Record<string, { clicks: number; cardClicks: number }> = {};
        trendFromServer.forEach(t => {
          trendMap[t.date] = {
            clicks: Number(t.clicks ?? t.views ?? 0),
            cardClicks: Number(t.cardClicks || 0),
          };
        });

        const daysToLookBack = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const filledTrend: TrendDatum[] = [];

        if (period === "24h") {
          // Hourly buckets for last 24h
          for (let i = 23; i >= 0; i--) {
            const d = new Date();
            d.setMinutes(0, 0, 0);
            d.setHours(d.getHours() - i);
            const key = d.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00:00Z');
            filledTrend.push({
              date: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              clicks: trendMap[key]?.clicks || 0,
              cardClicks: trendMap[key]?.cardClicks || 0,
            });
          }
        } else {
          // Daily buckets
          for (let i = daysToLookBack - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const isoDate = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            filledTrend.push({
              date: label,
              clicks: trendMap[isoDate]?.clicks || 0,
              cardClicks: trendMap[isoDate]?.cardClicks || 0,
            });
          }
        }
        setTrendData(filledTrend);

        // 8. Heatmap — server returns ready 7×24 matrix
        setHeatmapData(stats.heatmap || Array.from({ length: 7 }, () => Array(24).fill(0)));
        setResolvedAnalyticsScope(analyticsScopeKey);
        hasData = true;

        // 9. Recent activities — small separate query (only 5 records with expand)
      } catch (error: unknown) {
        if (!active || (error as { isAbort?: boolean }).isAbort) return;
        console.error("Analytics fetch error:", error);
        if (hasData) {
          toast.error("Couldn't refresh analytics. Showing the last loaded data.");
          return;
        }
        setClicksCount(0);
        setUniqueCount(0);
        setProfileCardClicks(0);
        setProfileCtr(0);
        setProfileCards([]);
        setCountries([]);
        setCountryMap([]);
        setReferrers([]);
        setDevices([]);
        setBrowserData([]);
        setOsData([]);
        setTrendData([]);
        setHeatmapData(Array.from({ length: 7 }, () => Array(24).fill(0)));
        setResolvedAnalyticsScope(analyticsScopeKey);
        toast.error("Failed to fetch analytics");
      } finally {
        inFlight = false;
        if (active) {
          loadedOnceRef.current = true;
          setLoading(false);
          setRefreshing(false);
          if (pendingReturnRefresh && document.visibilityState !== "hidden") {
            void fetchAnalytics(true);
          }
        }
      }
    };
    void fetchAnalytics();
    const stopReturnRefresh = refreshOnTabReturn(() => fetchAnalytics(true));
    return () => {
      active = false;
      stopReturnRefresh();
      pb.cancelRequest(requestKey);
    };
  }, [analyticsScopeKey, canUseAnalytics, isProfileMode, linkId, period, profileOptionsLoaded, profileScope, profileScopeNeedsNormalization, user?.id]);

  useEffect(() => {
    if (!canUseAnalytics || !user?.id) return;
    if (isProfileMode) {
      setRecentActivities([]);
      return;
    }
    let active = true;
    let inFlight = false;
    let pendingReturnRefresh = false;
    const requestKey = "analytics-recent";
    const queryParams = new URLSearchParams();
    if (linkId) queryParams.set("linkId", linkId);
    const suffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const fetchRecent = async () => {
      if (!active) return;
      if (inFlight) {
        pendingReturnRefresh = true;
        return;
      }
      inFlight = true;
      pendingReturnRefresh = false;
      try {
        const result: { items?: ClickRecord[] } = await pb.send(`/api/analytics/recent${suffix}`, {
          method: "GET", requestKey, cache: "no-store",
        });
        if (active) setRecentActivities(result.items || []);
      } catch (error: unknown) {
        if (active && !(error as { isAbort?: boolean }).isAbort) {
          console.error("Recent analytics fetch error:", error);
        }
      } finally {
        inFlight = false;
        if (active && pendingReturnRefresh && document.visibilityState !== "hidden") {
          void fetchRecent();
        }
      }
    };
    void fetchRecent();
    const stopReturnRefresh = refreshOnTabReturn(fetchRecent);

    return () => {
      active = false;
      stopReturnRefresh();
      pb.cancelRequest(requestKey);
    };
  }, [linkId, isProfileMode, canUseAnalytics, user?.id]);

  if (!canUseAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 relative">
          <BarChart3 className="w-10 h-10 text-accent opacity-50" />
          <Lock className="w-6 h-6 text-foreground absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Advanced Analytics</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Unlock detailed link and profile analytics, geographic data, and device insights with Creator Pro.
          </p>
        </div>
        <Link to="/dashboard/pricing" className="btn-primary-glow px-8 py-3 mt-4">
          Upgrade to Creator Pro
        </Link>
      </div>
    );
  }

  if (loading || resolvedAnalyticsScope !== analyticsScopeKey || (isProfileMode && !profileOptionsLoaded)) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-surface rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-surface rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-surface rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 space-y-2">
              <div className="h-3 w-20 bg-surface rounded animate-pulse" />
              <div className="h-7 w-16 bg-surface rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6 space-y-4">
          <div className="h-5 w-28 bg-surface rounded animate-pulse" />
          <div className="h-[300px] bg-surface rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const COLORS = ["hsl(153, 68%, 55%)", "hsl(155, 35%, 25%)", "hsl(155, 20%, 40%)"];
  const activeProfile = profileOptions.find(profile => profile.id === profileId);
  const activityLabel = isProfileMode ? "views" : "clicks";
  const selectLinksMode = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("profile");
    setSearchParams(next);
  };
  const selectProfileMode = (nextProfileId?: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete("link");
    next.set("profile", nextProfileId || ALL_PROFILES_SCOPE);
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isProfileMode
              ? isAllProfiles
                ? `Combined performance across ${profileOptions.length} ${profileOptions.length === 1 ? "profile" : "profiles"}`
                : `Profile performance${activeProfile ? ` for @${activeProfile.slug}` : ""}`
              : linkId ? "Showing stats for specific link" : "Across all your links"}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border">
          {refreshing && <Loader2 className="ml-1 h-4 w-4 animate-spin text-accent" aria-label="Refreshing analytics" />}
          {["24h", "7d", "30d", "90d"].map((p) => (
            <button key={p} disabled={refreshing} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-70 ${period === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-border bg-background/35 p-1" role="group" aria-label="Analytics resource type">
          <button
            type="button"
            onClick={selectLinksMode}
            aria-pressed={!isProfileMode}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${!isProfileMode ? "bg-accent text-black" : "text-muted-foreground hover:text-foreground"}`}
          >
            Links
          </button>
          <button
            type="button"
            onClick={() => selectProfileMode()}
            disabled={profileOptionsLoaded && !profileOptionsFailed && profileOptions.length === 0}
            aria-pressed={isProfileMode}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-40 ${isProfileMode ? "bg-accent text-black" : "text-muted-foreground hover:text-foreground"}`}
          >
            Profiles
          </button>
        </div>

        {isProfileMode && (
          <div className="w-full sm:w-auto">
            <ProfileScopeSelect
              profiles={profileOptions}
              value={profileScope || ALL_PROFILES_SCOPE}
              onValueChange={selectProfileMode}
            />
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isProfileMode ? (
          <>
            <div className="glass-card p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><Eye className="h-3.5 w-3.5 text-accent" /> Profile Views</p>
              <div className="text-2xl font-bold">{clicksCount.toLocaleString()}</div>
            </div>
            <div className="glass-card border-l-2 border-l-accent/30 p-4">
              <p
                className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent"
                title={isAllProfiles ? "Deduplicated per profile and day" : "Deduplicated per day"}
              >
                <Users className="h-3.5 w-3.5" /> {isAllProfiles ? "Unique Profile Visits" : "Unique Visits"}
              </p>
              <div className="text-2xl font-bold">{uniqueCount.toLocaleString()}</div>
            </div>
            <div className="glass-card p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><MousePointerClick className="h-3.5 w-3.5 text-accent" /> Card Clicks</p>
              <div className="text-2xl font-bold">{profileCardClicks.toLocaleString()}</div>
            </div>
            <div className="glass-card border-l-2 border-l-muted-foreground/30 p-4">
              <p
                className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
                title="Card clicks divided by profile views. It can exceed 100% when a visitor opens more than one card."
              >
                <Gauge className="h-3.5 w-3.5 text-accent" /> Card Click Rate
              </p>
              <div className="text-2xl font-bold">{profileCtr.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</div>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Clicks</p>
              <div className="text-2xl font-bold">{clicksCount.toLocaleString()}</div>
            </div>
            <div className="glass-card p-4 border-l-accent/30 border-l-2">
              <p className="text-xs text-accent uppercase font-bold tracking-wider mb-1">Unique Clicks</p>
              <div className="text-2xl font-bold">{uniqueCount.toLocaleString()}</div>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Avg. Daily</p>
              <div className="text-2xl font-bold">{Math.round(clicksCount / ({ "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[period] || 1)).toLocaleString()}</div>
            </div>
            <div className="glass-card p-4 border-l-muted-foreground/30 border-l-2">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Top Location</p>
              <div className="text-2xl font-bold truncate" title={countries[0]?.name || "N/A"}>{countries[0]?.name || "N/A"}</div>
            </div>
          </>
        )}
      </div>

      {/* Clicks chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{isProfileMode ? "Profile Funnel Trend" : "Click Trends"}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="hsl(155, 15%, 16%)" />
            <XAxis dataKey="date" stroke="hsl(150, 8%, 55%)" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="hsl(150, 8%, 55%)" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(155, 35%, 9%)", border: "1px solid hsl(155, 15%, 20%)", borderRadius: "12px" }} />
            <Area name={isProfileMode ? "Profile views" : "Clicks"} type="monotone" dataKey="clicks" stroke="hsl(153, 68%, 55%)" fill="url(#analyticsGradient)" strokeWidth={3} />
            {isProfileMode && <Area name="Card clicks" type="monotone" dataKey="cardClicks" stroke="hsl(189, 78%, 58%)" fill="none" strokeWidth={2} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <WorldTrafficMap countries={countryMap} metric={isProfileMode ? "views" : "clicks"} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-accent" /> Top Locations</h2>
            <AnalyticsStatBadge>
              Top 6
            </AnalyticsStatBadge>
          </div>
          <div className="space-y-4">
            {countries.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : countries.slice(0, 6).map((c) => (
              <div key={c.code || c.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.clicks} {activityLabel}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${Math.max(2, (c.clicks / Math.max(countries[0]?.clicks || 1, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-accent" /> Traffic Sources</h2>
          <div className="space-y-4">
            {referrers.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : referrers.map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.clicks} {activityLabel}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Devices Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><Smartphone className="w-4 h-4 text-accent" /> Devices</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? devices : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {devices.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "#1e293b"} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {devices.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}</div>
                <span className="text-muted-foreground">{clicksCount > 0 ? `${Math.round(d.value / clicksCount * 100)}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><Monitor className="w-4 h-4 text-accent" /> Browsers</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? browserData : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {browserData.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "#1e293b"} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {browserData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}</div>
                <span className="text-muted-foreground">{clicksCount > 0 ? `${Math.round(d.value / clicksCount * 100)}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OS Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><TabletSmartphone className="w-4 h-4 text-accent" /> OS</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? osData : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {osData.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "#1e293b"} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {osData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}</div>
                <span className="text-muted-foreground">{clicksCount > 0 ? `${Math.round(d.value / clicksCount * 100)}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Click Heatmap */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" /> Activity Heatmap
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Best times for engagement — brighter = more {activityLabel}</p>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-12 mb-1">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
                  {h % 3 === 0 ? `${h}:00` : ''}
                </div>
              ))}
            </div>
            {/* Rows */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="w-10 text-[10px] text-muted-foreground font-medium text-right pr-2">{day}</span>
                {heatmapData[dayIdx].map((count, h) => {
                  const max = Math.max(...heatmapData.flat(), 1);
                  const intensity = count / max;
                  return (
                    <div
                      key={h}
                      className="flex-1 h-5 rounded-sm transition-colors cursor-pointer group relative"
                      style={{
                        backgroundColor: count === 0
                          ? 'hsl(155, 15%, 10%)'
                          : `hsla(153, 68%, 55%, ${0.15 + intensity * 0.85})`
                      }}
                      title={`${day} ${h}:00 — ${count} ${activityLabel}`}
                    />
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: v === 0 ? 'hsl(155, 15%, 10%)' : `hsla(153, 68%, 55%, ${0.15 + v * 0.85})` }} />
              ))}
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </div>

      {isProfileMode ? (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-accent/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MousePointerClick className="h-4 w-4 text-accent" />
              Card Performance
            </h3>
            <span className="text-xs text-muted-foreground">
              {isAllProfiles ? "Clicks attributed across all profiles" : "Clicks attributed to this profile"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/50 font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Card</th>
                  <th className="px-6 py-3 text-right">Clicks</th>
                  <th className="px-6 py-3 text-right" title="Card clicks divided by profile views">Click rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profileCards.map(card => (
                  <tr key={card.profileLinkId} className="transition-colors hover:bg-surface-hover">
                    <td className="max-w-[280px] px-6 py-4">
                      <div className="truncate font-medium text-foreground" title={card.title}>{card.title}</div>
                      {isAllProfiles && card.profileSlug && (
                        <div className="mt-1 truncate text-[11px] text-muted-foreground">
                          {card.profileName || "Profile"} · @{card.profileSlug}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">{card.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-accent">{card.ctr.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</td>
                  </tr>
                ))}
                {profileCards.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">No attributed card clicks in this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      /* Real-time Click Stream */
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-accent/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Live Click Stream
          </h3>
          <span className="text-xs text-muted-foreground">Showing latest activity</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/50 text-muted-foreground uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Link</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Device / OS</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3 text-right">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentActivities.map((r) => (
                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 font-medium text-accent truncate max-w-[150px]" title={r.expand?.link_id?.title || r.expand?.link_id?.slug || '—'}>
                    {r.expand?.link_id?.title || r.expand?.link_id?.slug || '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{getCountryDisplayName(r.country)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{r.device}</span>
                      <span className="text-muted-foreground">({r.os})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{r.referrer}</td>
                  <td className="px-6 py-4 text-right">
                    {r.is_unique ? (
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">UNIQUE</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">RAW</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentActivities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No recent activity detected</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
