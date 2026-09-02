import { useState, useEffect } from "react";
import { BarChart3, Link2, MousePointer, TrendingUp, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import styles from "./DashboardHome.module.css";

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClicks: 0,
    activeLinks: 0,
    clickRate: 0,
  });
  const [trendData, setTrendData] = useState<{ name: string; clicks: number }[]>([]);
  const [recentClicks, setRecentClicks] = useState<{ slug: string; country: string; device: string; time: string }[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentUnavailable, setRecentUnavailable] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await pb.send('/api/dashboard/summary', {
          method: 'GET',
          requestKey: 'dashboard-summary',
        }) as {
          totalClicks?: number;
          activeLinks?: number;
          totalLinks?: number;
          trend?: { day: string; clicks: number }[];
        };

        const totalClicks = response.totalClicks || 0;
        const activeLinks = response.activeLinks || 0;
        const totalLinks = response.totalLinks || 0;

        setStats({
          totalClicks,
          activeLinks,
          clickRate: totalLinks > 0 ? Math.round((totalClicks / totalLinks) * 10) / 10 : 0,
        });

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const trendByDay = new Map((response.trend || []).map((entry) => [entry.day, entry.clicks]));
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - i);
          const key = d.toISOString().slice(0, 10);
          return { name: days[d.getUTCDay()], clicks: trendByDay.get(key) || 0 };
        }).reverse();
        setTrendData(last7Days);

      } catch (error: unknown) {
        if (!(error as { isAbort?: boolean }).isAbort) {
          toast.error("Failed to load dashboard data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    const fetchRecentClicks = async () => {
      try {
        const response = await pb.send('/api/dashboard/recent', {
          method: 'GET',
          requestKey: 'dashboard-recent',
        }) as {
          items?: { slug: string; country: string; device: string; created: string }[];
        };

        setRecentClicks((response.items || []).map((click) => ({
          slug: click.slug || "unknown",
          country: (() => {
            const raw = click.country || "Unknown";
            if (raw === "Unknown" || raw.length !== 2) return raw;
            try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(raw) || raw; } catch { return raw; }
          })(),
          device: click.device || "Other",
          time: new Date(click.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })));
      } catch (error: unknown) {
        if (!(error as { isAbort?: boolean }).isAbort) {
          setRecentUnavailable(true);
        }
      } finally {
        setRecentLoading(false);
      }
    };

    fetchRecentClicks();
  }, []);

  if (loading) {
    return (
      <div className={styles.page} aria-busy="true" aria-label="Loading dashboard">
        <div className={styles.skeletonHeader}>
          <span className={styles.skeletonTitle} />
          <span className={styles.skeletonCopy} />
        </div>
        <div className={styles.skeletonMetrics}>
          {[1, 2, 3].map((item) => <span key={item} />)}
        </div>
        <div className={styles.details}>
          <div className={`${styles.panel} ${styles.skeletonPanel}`} />
          <div className={`${styles.panel} ${styles.skeletonPanel}`} />
        </div>
      </div>
    );
  }

  const metrics = [
    { title: "Total Clicks", value: stats.totalClicks.toLocaleString(), icon: MousePointer },
    { title: "Active Links", value: stats.activeLinks.toString(), icon: Link2 },
    { title: "Avg Clicks/Link", value: stats.clickRate.toString(), icon: TrendingUp },
  ];

  const displayName = pb.authStore.model?.name || pb.authStore.model?.username || "Friend";
  const hasTraffic = trendData.some((entry) => entry.clicks > 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={styles.page}
    >
      <motion.header variants={itemVariants} className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <h1>Dashboard</h1>
          <p>Welcome back, <strong>{displayName}</strong>. Here’s what’s happening with your links.</p>
        </div>
        <Link to="/dashboard/links/create" className={styles.primary}>
          <Plus className="w-4 h-4" aria-hidden="true" /> Create link
        </Link>
      </motion.header>


      {/* Metrics */}
      <motion.section variants={itemVariants} className={styles.metrics} aria-label="Link performance overview">
        {metrics.map((m) => (
          <article key={m.title} className={styles.metric}>
            <div className={styles.metricLabel}>
              <m.icon className="w-4 h-4" aria-hidden="true" />
              <span>{m.title}</span>
            </div>
            <div className={styles.metricValue}>{m.value}</div>
          </article>
        ))}
      </motion.section>

      <div className={styles.details}>
        {/* Chart */}
        <motion.section variants={itemVariants} className={`${styles.panel} ${styles.chartPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Clicks this week</h2>
              <p>Last 7 days</p>
            </div>
          </div>
          {hasTraffic ? (
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--app-accent)" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="var(--app-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--app-grid)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--app-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--app-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--app-panel-strong)",
                      border: "1px solid var(--app-rule)",
                      borderRadius: "var(--app-radius-control)",
                      color: "var(--app-ink)",
                    }}
                  />
                  <Area type="monotone" dataKey="clicks" stroke="var(--app-accent)" fill="url(#clickGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.emptyChart}>
              <div className={styles.emptyChartPreview} aria-hidden="true">
                <svg viewBox="0 0 800 240" preserveAspectRatio="none">
                  <path d="M0 206 C88 194 116 168 176 178 C250 190 274 108 350 132 C424 156 458 68 528 86 C612 108 642 28 800 42" />
                  <path d="M0 214 C104 206 148 188 222 194 C312 204 350 154 430 166 C528 180 602 106 800 126" />
                </svg>
              </div>
              <div className={styles.emptyChartContent}>
                <span className={styles.emptyIcon}><BarChart3 aria-hidden="true" /></span>
                <div>
                  <strong>Traffic will appear here</strong>
                  <p>Clicks are added to this chart as people visit your links.</p>
                </div>
                <Link to="/dashboard/links/create" className={styles.secondaryAction}>Create a link</Link>
              </div>
            </div>
          )}
        </motion.section>

        {/* Recent Clicks */}
        <motion.section variants={itemVariants} className={`${styles.panel} ${styles.activityPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recent clicks</h2>
              <p>Latest activity</p>
            </div>
            <Link to="/dashboard/analytics" className={styles.panelLink}>View analytics</Link>
          </div>
          <div className={styles.activityList}>
            {recentLoading ? (
              [1, 2, 3].map((item) => (
                <div key={item} className={styles.activitySkeleton} />
              ))
            ) : recentUnavailable ? (
              <div className={styles.emptyRecent}><strong>Activity unavailable</strong><span>Refresh the page to try loading recent clicks again.</span></div>
            ) : recentClicks.length === 0 ? (
              <div className={styles.emptyRecent}><strong>No recent clicks</strong><span>New visits will appear here as they happen.</span></div>
            ) : recentClicks.map((c, i) => (
              <div key={i} className={styles.recentRow}>
                <div>
                  <strong>/{c.slug}</strong>
                  <small>{c.country} · {c.device}</small>
                </div>
                <span>{c.time}</span>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
