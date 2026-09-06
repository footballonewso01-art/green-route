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
import styles from "./AnalyticsPage.module.css";
import {
  DashboardMetric,
  DashboardMetricRail,
  DashboardPage,
  DashboardPageHeader,
  DashboardPanel,
} from "@/components/dashboard/DashboardPrimitives";

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

export default function AnalyticsPage({ adminUserId, adminLinks }: {
  adminUserId?: string;
  adminLinks?: { id: string; name: string; slug: string }[];
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const linkId = searchParams.get("link");
  const profileScope = searchParams.get("profile");
  const isProfileMode = profileScope !== null;
  const isAllProfiles = profileScope === ALL_PROFILES_SCOPE || profileScope === "";
  const profileId = isProfileMode && !isAllProfiles ? profileScope : null;
  const { user } = useAuth();
  const subjectId = adminUserId || user?.id;
  const analyticsScopeKey = `${subjectId || "guest"}|${isProfileMode
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
  const canUseAnalytics = (Boolean(adminUserId) && user?.role === "admin") || checkPlan(userPlan, "analytics");
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
      filter: pb.filter('user_id={:id}', { id: subjectId }),
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
  }, [canUseAnalytics, user?.id, subjectId]);

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
        if (adminUserId) queryParams.set("adminUserId", adminUserId);
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
          { name: "Mobile", value: deviceMap["Mobile"] || 0, color: "var(--app-accent)" },
          { name: "Desktop", value: deviceMap["Desktop"] || 0, color: "var(--app-panel-hover)" },
          { name: "Tablet", value: deviceMap["Tablet"] || 0, color: "var(--app-control-rule)" },
        ]);

        // 5. Browsers (add colors)
        const browserColors = ["var(--app-accent)", "var(--app-panel-hover)", "var(--app-control-rule)"];
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
  }, [analyticsScopeKey, canUseAnalytics, isProfileMode, linkId, period, profileOptionsLoaded, profileScope, profileScopeNeedsNormalization, user?.id, adminUserId]);

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
    if (adminUserId) queryParams.set("adminUserId", adminUserId);
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
  }, [linkId, isProfileMode, canUseAnalytics, user?.id, adminUserId]);

  if (!canUseAnalytics) {
    return (
      <DashboardPage>
        <DashboardPageHeader eyebrow="Performance" title="Analytics" description="Understand where traffic comes from and what converts." />
        <DashboardPanel className={styles.lockedPanel} aria-labelledby="locked-analytics-title">
          <div className={styles.lockedPreview} aria-hidden="true">
            <div className={styles.previewMetrics}>
              {[0, 1, 2].map((item) => (
                <div className={styles.previewMetric} key={item}>
                  <span />
                  <strong />
                </div>
              ))}
            </div>
            <div className={styles.previewChart}>
              <svg viewBox="0 0 760 220" preserveAspectRatio="none">
                <path d="M0 184 C72 178 105 142 164 154 C232 168 270 78 340 108 C416 140 458 52 526 72 C606 96 650 32 760 38" />
                <path d="M0 198 C98 190 134 174 206 182 C288 190 334 136 406 150 C510 170 594 104 760 118" />
              </svg>
            </div>
            <div className={styles.previewSegments}>
              <div className={styles.previewSegment} />
              <div className={styles.previewSegment} />
            </div>
          </div>
          <div className={styles.lockedVeil} aria-hidden="true" />
          <div className={styles.lockedContent}>
            <span className={styles.lockedIcon}>
              <BarChart3 aria-hidden="true" />
              <Lock aria-hidden="true" />
            </span>
            <span className={styles.lockedKicker}>Creator Pro</span>
            <h2 id="locked-analytics-title">See what drives every click.</h2>
            <p>Unlock detailed link and profile analytics, geographic data, and device insights.</p>
            <div className={styles.lockedFeatures} aria-label="Analytics available with Creator Pro">
              <span><MousePointerClick aria-hidden="true" /> Link performance</span>
              <span><Globe aria-hidden="true" /> Country insights</span>
              <span><Smartphone aria-hidden="true" /> Device breakdown</span>
            </div>
            <Link to="/dashboard/pricing" className={styles.upgradeAction}>Upgrade to Creator Pro</Link>
          </div>
        </DashboardPanel>
      </DashboardPage>
    );
  }

  if (loading || resolvedAnalyticsScope !== analyticsScopeKey || (isProfileMode && !profileOptionsLoaded)) {
    return (
      <DashboardPage>
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-surface rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-surface rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-surface rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <DashboardPanel key={i} className={styles.skeletonMetric}>
              <div className="h-3 w-20 bg-surface rounded animate-pulse" />
              <div className="h-7 w-16 bg-surface rounded animate-pulse" />
            </DashboardPanel>
          ))}
        </div>
        <DashboardPanel className={styles.skeletonChart}>
          <div className="h-5 w-28 bg-surface rounded animate-pulse" />
          <div className="h-[300px] bg-surface rounded-xl animate-pulse" />
        </DashboardPanel>
      </DashboardPage>
    );
  }

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
  const analyticsDescription = isProfileMode
    ? isAllProfiles
      ? `Combined performance across ${profileOptions.length} ${profileOptions.length === 1 ? "profile" : "profiles"}`
      : `Profile performance${activeProfile ? ` for @${activeProfile.slug}` : ""}`
    : linkId
      ? "Showing stats for a specific link"
      : "Performance across all your links";

  return (
    <DashboardPage>
      <DashboardPageHeader
        eyebrow="Performance"
        title="Analytics"
        headingLevel={adminUserId ? 2 : 1}
        description={analyticsDescription}
        actions={(
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border">
          {refreshing && <Loader2 className="ml-1 h-4 w-4 animate-spin text-accent" aria-label="Refreshing analytics" />}
          {["24h", "7d", "30d", "90d"].map((p) => (
            <button key={p} disabled={refreshing} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-70 ${period === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
        )}
      />

      <DashboardPanel className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
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

        {!isProfileMode && adminUserId && adminLinks && (
          <select
            aria-label="Analytics link"
            className="min-h-10 min-w-0 max-w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground sm:max-w-xs"
            value={linkId || "all"}
            onChange={event => {
              const next = new URLSearchParams(searchParams);
              next.delete("profile");
              if (event.target.value === "all") next.delete("link");
              else next.set("link", event.target.value);
              setSearchParams(next);
            }}
          >
            <option value="all">All links</option>
            {adminLinks.map(link => <option key={link.id} value={link.id}>{link.name} /{link.slug}</option>)}
          </select>
        )}
        {isProfileMode && (
          <div className="w-full sm:w-auto">
            <ProfileScopeSelect
              profiles={profileOptions}
              value={profileScope || ALL_PROFILES_SCOPE}
              onValueChange={selectProfileMode}
            />
          </div>
        )}
      </DashboardPanel>

      {/* Stats Overview */}
      <DashboardMetricRail columns={4}>
        {isProfileMode ? (
          <>
            <DashboardMetric label="Profile Views" value={clicksCount.toLocaleString()} icon={<Eye className="h-3.5 w-3.5" />} />
            <DashboardMetric label={isAllProfiles ? "Unique Profile Visits" : "Unique Visits"} value={uniqueCount.toLocaleString()} icon={<Users className="h-3.5 w-3.5" />} />
            <DashboardMetric label="Card Clicks" value={profileCardClicks.toLocaleString()} icon={<MousePointerClick className="h-3.5 w-3.5" />} />
            <DashboardMetric label="Card Click Rate" value={`${profileCtr.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`} icon={<Gauge className="h-3.5 w-3.5" />} />
          </>
        ) : (
          <>
            <DashboardMetric label="Total clicks" value={clicksCount.toLocaleString()} />
            <DashboardMetric label="Unique clicks" value={uniqueCount.toLocaleString()} />
            <DashboardMetric label="Average daily" value={Math.round(clicksCount / ({ "24h": 1, "7d": 7, "30d": 30, "90d": 90 }[period] || 1)).toLocaleString()} />
            <DashboardMetric label="Top location" value={countries[0]?.name || "N/A"} />
          </>
        )}
      </DashboardMetricRail>

      {/* Clicks chart */}
      <DashboardPanel className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{isProfileMode ? "Profile Funnel Trend" : "Click Trends"}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--app-accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--app-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="var(--app-grid)" />
            <XAxis dataKey="date" stroke="var(--app-muted)" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--app-muted)" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--app-panel-strong)", border: "1px solid var(--app-rule)", borderRadius: "var(--app-radius-control)" }} />
            <Area name={isProfileMode ? "Profile views" : "Clicks"} type="monotone" dataKey="clicks" stroke="var(--app-accent)" fill="url(#analyticsGradient)" strokeWidth={3} />
            {isProfileMode && <Area name="Card clicks" type="monotone" dataKey="cardClicks" stroke="var(--app-focus)" fill="none" strokeWidth={2} />}
          </AreaChart>
        </ResponsiveContainer>
      </DashboardPanel>

      <WorldTrafficMap countries={countryMap} metric={isProfileMode ? "views" : "clicks"} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Countries */}
        <DashboardPanel className="p-6">
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
                    className="h-full bg-accent"
                    style={{ width: `${Math.max(2, (c.clicks / Math.max(countries[0]?.clicks || 1, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        {/* Traffic Sources */}
        <DashboardPanel className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-accent" /> Traffic Sources</h2>
          <div className="space-y-4">
            {referrers.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : referrers.map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.clicks} {activityLabel}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Devices Pie */}
        <DashboardPanel className="p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><Smartphone className="w-4 h-4 text-accent" /> Devices</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? devices : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {devices.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "var(--app-panel-sunken)"} />)}
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
        </DashboardPanel>

        {/* Browser Pie */}
        <DashboardPanel className="p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><Monitor className="w-4 h-4 text-accent" /> Browsers</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? browserData : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {browserData.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "var(--app-panel-sunken)"} />)}
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
        </DashboardPanel>

        {/* OS Pie */}
        <DashboardPanel className="p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><TabletSmartphone className="w-4 h-4 text-accent" /> OS</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? osData : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {osData.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "var(--app-panel-sunken)"} />)}
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
        </DashboardPanel>
      </div>

      {/* Click Heatmap */}
      <DashboardPanel className="p-6">
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
                          ? 'var(--app-panel-sunken)'
                          : `color-mix(in oklab, var(--app-accent) ${15 + intensity * 85}%, var(--app-panel-sunken))`
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
                <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: v === 0 ? 'var(--app-panel-sunken)' : `color-mix(in oklab, var(--app-accent) ${15 + v * 85}%, var(--app-panel-sunken))` }} />
              ))}
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </DashboardPanel>

      {isProfileMode ? (
        <DashboardPanel className="overflow-hidden !p-0">
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
        </DashboardPanel>
      ) : (
      /* Real-time Click Stream */
      <DashboardPanel className="overflow-hidden !p-0">
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
      </DashboardPanel>
      )}
    </DashboardPage>
  );
}
