import { useState, useEffect, useRef } from "react";
import { User, Globe, ChevronRight, Gift, CheckCircle, Camera, Zap, Calendar, Receipt, Lock, Building2, AtSign, Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, PlanType } from "@/lib/plans";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { maskError } from "@/lib/utils";
import { BillingRecord, formatBillingDate } from "@/lib/billing";
import { CancelRenewalButton } from "@/components/billing/CancelRenewalButton";
import { ApiAccessSettings } from "@/components/settings/ApiAccessSettings";

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
  comingSoon?: boolean;
}

const sections: SettingsSection[] = [
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "api", label: "API Access", icon: KeyRound },
  { id: "billing", label: "Plan & Billing", icon: Receipt },
  { id: "domains", label: "Custom Domain", icon: Globe, comingSoon: true },
];

const SETTINGS_SECTION_PARAM = "section";

const resolveSettingsSection = (value: string | null) =>
  sections.some((section) => !section.comingSoon && section.id === value)
    ? value as string
    : "account";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const active = resolveSettingsSection(searchParams.get(SETTINGS_SECTION_PARAM));
  const stripeSessionId = searchParams.get("session_id");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [promocode, setPromocode] = useState("");
  const [loadingPromocode, setLoadingPromocode] = useState(false);
  const [billingRevision, setBillingRevision] = useState(0);

  // Account profile editing state
  const [accountUsername, setAccountUsername] = useState(user?.username || "");
  const [accountAvatarPreview, setAccountAvatarPreview] = useState<string | null>(
    user?.avatar && user?.collectionId ? pb.files.getUrl(user as unknown as Record<string, unknown>, user.avatar) : null
  );
  const [accountAvatarFile, setAccountAvatarFile] = useState<File | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const accountAvatarRef = useRef<HTMLInputElement>(null);

  const userPlan = (user as { plan?: string })?.plan || "creator";
  const plan = PLANS[userPlan as PlanType];
  const PlanIcon = userPlan === "agency" ? Building2 : Zap;
  const hasUsedPromocode = !!user?.promocode_used;
  const usernameChangedAt = user?.username_last_changed ? new Date(user.username_last_changed).getTime() : NaN;
  const usernameUnlockAt = Number.isFinite(usernameChangedAt)
    ? usernameChangedAt + 21 * 24 * 60 * 60 * 1000
    : 0;
  const usernameLocked = usernameUnlockAt > Date.now();
  const usernameDaysRemaining = usernameLocked
    ? Math.max(1, Math.ceil((usernameUnlockAt - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  const [subStatus, setSubStatus] = useState<"active" | "canceling" | "none">("none");

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Billing state
  const [billingLogs, setBillingLogs] = useState<BillingRecord[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setAccountUsername(user?.username || "");
    setAccountAvatarPreview(
      user?.avatar && user?.collectionId
        ? pb.files.getUrl(user as unknown as Record<string, unknown>, user.avatar)
        : null
    );
  }, [user]);

  useEffect(() => {
    const checkActiveSub = async () => {
      if (!user) return;
      try {
        const result = await pb.collection("billing").getList(1, 1, {
          filter: `user_id="${user.id}" && (status="active" || status="canceling")`,
          sort: "-created",
          requestKey: null
        });
        if (result.totalItems > 0) {
          const status = result.items[0].status;
          setSubStatus(status as "active" | "canceling");
        } else {
          setSubStatus("none");
        }
      } catch (err) {
        console.error("Failed to check active subscription", err);
        setSubStatus("none");
      }
    };
    checkActiveSub();
  }, [user, billingRevision]);

  // Verify Stripe session on return from checkout
  useEffect(() => {
    if (!stripeSessionId || !user) return;

    const verifySession = async () => {
      setVerifying(true);
      try {
        const result = await pb.send("/api/stripe/verify-session", {
          method: "POST",
          body: { sessionId: stripeSessionId }
        });
        if (result.activated) {
          // Keep session_id on transient failures so a reload can retry.
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete("session_id");
            return next;
          }, { replace: true });
          toast.success(`🎉 ${result.plan.charAt(0).toUpperCase() + result.plan.slice(1)} plan activated!`);
          if (refreshUser) await refreshUser();
        } else {
          toast.error("Payment received, but plan activation is still pending. Reload this page to retry.");
        }
      } catch (err) {
        console.error("Session verify error:", err);
        toast.error("Payment received, but plan activation is still pending. Reload this page to retry.");
      } finally {
        setVerifying(false);
      }
    };
    verifySession();
  }, [refreshUser, setSearchParams, stripeSessionId, user]);

  // Fetch billing logs
  useEffect(() => {
    const fetchBilling = async () => {
      if (!user) return;
      try {
        const result = await pb.collection("billing").getList(1, 50, {
          filter: `user_id="${user.id}"`,
          sort: "-created",
          requestKey: null
        });
        setBillingLogs(result.items as unknown as BillingRecord[]);
      } catch (err) {
        console.error("Failed to fetch billing records", err);
      } finally {
        setBillingLoading(false);
      }
    };
    fetchBilling();
  }, [user, verifying, billingRevision]);

  const hasStripeCustomer = billingLogs.some(
    log => log.payment_method === "Stripe" && (log.status === "active" || log.status === "canceling")
  );

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      try {
        await pb.collection('users').authRefresh();
      } catch (refreshErr) {
        const status = (refreshErr as { status?: number })?.status;
        if (status === 401 || status === 403) {
          toast.error("Your session has expired. Please log in again.");
          pb.authStore.clear();
          localStorage.removeItem("pocketbase_auth");
          window.location.href = "/login";
          return;
        }
      }

      if (!pb.authStore.isValid || !pb.authStore.token) {
        toast.error("Your session has expired. Please log in again.");
        window.location.href = "/login";
        return;
      }

      const data = await pb.send("/api/stripe/create-portal", { method: "POST" });
      window.location.assign(data.url);
    } catch (e: unknown) {
      console.error("Billing portal error:", e);
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) {
        toast.error("Your session has expired. Please log in again.");
        pb.authStore.clear();
        localStorage.removeItem("pocketbase_auth");
        window.location.href = "/login";
      } else {
        toast.error(maskError(e, "Failed to open billing portal"));
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSectionClick = (section: SettingsSection) => {
    if (section.comingSoon) {
      toast.info(`${section.label} is coming soon!`);
      return;
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (section.id === "account") {
        next.delete(SETTINGS_SECTION_PARAM);
      } else {
        next.set(SETTINGS_SECTION_PARAM, section.id);
      }
      return next;
    }, { replace: true });
    setSidebarOpen(false);
  };

  const handleApplyPromocode = async () => {
    const code = promocode.trim();
    if (!code) {
      toast.error("Please enter a promocode");
      return;
    }

    setLoadingPromocode(true);
    try {
      const res = await pb.send("/api/promocodes/apply", {
        method: "POST",
        body: { code }
      });
      if (res.success) {
        toast.success(res.message);
        await pb.collection("users").authRefresh();
      } else {
        toast.error("This promo code couldn't be applied. Check its status and try again.");
      }
    } catch (err) {
      const error = err as { response?: { message?: string; error?: string }; message?: string };
      console.error("Promocode apply error:", error);
      toast.error(maskError(error, "Failed to apply promocode"));
    } finally {
      setLoadingPromocode(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoadingPassword(true);
    try {
      await pb.collection("users").update(user!.id, {
        oldPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      });
      toast.success("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, { message?: string }> }, message?: string };
      console.error("Password update error:", err?.response || err);

      const data = err?.response?.data;
      if (data) {
        if (data.oldPassword) {
          toast.error("Current password is incorrect.");
        } else if (data.password) {
          toast.error("New password does not meet the security requirements.");
        } else if (data.passwordConfirm) {
          toast.error("Password confirmation does not match.");
        } else {
          toast.error("We couldn't update the password. Check the fields and try again.");
        }
      } else {
        console.error("Password update error:", err);
        toast.error(maskError(err, "Failed to update password. Please try again."));
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!user) return;
    const cleanUsername = accountUsername.trim().toLowerCase();
    const usernameChanged = cleanUsername !== user.username;

    if (usernameChanged && !/^[a-z0-9_.-]{3,22}$/.test(cleanUsername)) {
      toast.error("Username must be 3–22 characters and use only letters, numbers, dots, underscores, or hyphens.");
      return;
    }
    if (usernameChanged && usernameLocked) {
      toast.error(`Username can be changed again in ${usernameDaysRemaining} day${usernameDaysRemaining === 1 ? "" : "s"}.`);
      return;
    }

    setSavingAccount(true);
    try {
      if (usernameChanged) {
        const existing = await pb.collection("users").getList(1, 1, {
          filter: `username="${cleanUsername}" && id!="${user.id}"`,
          requestKey: null
        });
        if (existing.totalItems > 0) {
          toast.error("This username is already taken.");
          return;
        }

        await pb.collection("users").update(user.id, { username: cleanUsername }, { requestKey: null });
      }

      if (accountAvatarFile) {
        const fd = new FormData();
        fd.append('avatar', accountAvatarFile);
        await pb.collection('users').update(user.id, fd, { requestKey: null });
        setAccountAvatarFile(null);
      }

      await refreshUser();
      toast.success(usernameChanged ? "Username updated successfully" : "Account updated successfully");
    } catch (err: unknown) {
      const error = err as {
        response?: { message?: string; data?: { username?: { message?: string } } };
        message?: string;
      };
      console.error('Account update error:', error);
      toast.error(maskError(error, 'We couldn\'t update the account. Check the username and try again.'));
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Mobile section selector button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center gap-3 w-full p-4 rounded-2xl bg-surface/50 border border-border/40 lg:hidden"
      >
        {(() => {
          const activeSection = sections.find(s => s.id === active);
          const Icon = activeSection?.icon || User;
          return (
            <>
              <Icon className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-foreground flex-1 text-left">{activeSection?.label}</span>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${sidebarOpen ? 'rotate-90' : ''}`} />
            </>
          );
        })()}
      </button>

      {/* Mobile dropdown nav */}
      {sidebarOpen && (
        <div className="lg:hidden rounded-2xl bg-surface/60 backdrop-blur-xl border border-border/40 overflow-hidden -mt-4">
          {sections.map((section) => {
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200 text-left ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                } ${section.comingSoon ? "opacity-40 cursor-default" : ""}`}
              >
                <section.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="text-sm font-medium flex-1">{section.label}</span>
                {section.comingSoon && (
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-white/50">Soon</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Split panel layout */}
      <div className="flex gap-0 lg:gap-0 min-h-[520px]">
        {/* Left sidebar navigation — desktop only */}
        <div className="hidden lg:flex flex-col w-[260px] shrink-0 rounded-l-3xl bg-surface/30 backdrop-blur-xl border border-border/30 border-r-0 overflow-hidden">
          <div className="p-3 flex flex-col gap-1">
            {sections.map((section) => {
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group ${
                    isActive
                      ? "bg-accent/10 text-accent border border-accent/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent"
                  } ${section.comingSoon ? "opacity-40 cursor-default hover:bg-transparent hover:text-muted-foreground" : ""}`}
                >
                  <section.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-accent' : ''}`} />
                  <span className="text-[13px] font-medium flex-1">{section.label}</span>
                  {section.comingSoon ? (
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-white/40">Soon</span>
                  ) : (
                    <ChevronRight className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-accent/60 translate-x-0.5' : 'text-transparent group-hover:text-muted-foreground/40'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right content panel */}
        <div className="flex-1 rounded-3xl lg:rounded-l-none bg-card/40 backdrop-blur-xl border border-border/30 lg:border-l-border/15 overflow-hidden relative">
          {/* Subtle decorative glow */}
          <div className="absolute -right-32 -top-32 w-80 h-80 bg-accent/[0.03] rounded-full blur-[120px] pointer-events-none" />

          <div className="p-6 sm:p-8 relative z-10 overflow-y-auto max-h-[calc(100vh-220px)]">

            {/* ============ ACCOUNT ============ */}
            {active === "account" && (
              <div className="space-y-8">
                {/* Section header */}
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Account</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage how your Linktery account is identified.</p>
                </div>

                {/* About You */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Account Identity</h3>

                  {/* Avatar + Username row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-surface/40 border border-border/40 rounded-2xl">
                    {/* Avatar */}
                    <div className="relative group shrink-0">
                      <div
                        className="w-16 h-16 rounded-2xl bg-accent/20 border-2 border-accent/20 flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 group-hover:border-accent/50 group-hover:shadow-lg group-hover:shadow-accent/10"
                        onClick={() => accountAvatarRef.current?.click()}
                      >
                        {accountAvatarPreview ? (
                          <img src={accountAvatarPreview} alt="Account avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-accent">{(user?.username?.[0] || user?.email?.[0] || "U").toUpperCase()}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="Choose account avatar"
                        onClick={() => accountAvatarRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                      <input
                        ref={accountAvatarRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Avatar must be under 5MB');
                              return;
                            }
                            setAccountAvatarFile(file);
                            setAccountAvatarPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Account avatar</p>
                      <p className="text-xs text-muted-foreground mt-1">Shown in the dashboard header and account menus. JPG, PNG, or WebP up to 5 MB.</p>
                    </div>
                  </div>

                  <div className="p-5 bg-surface/40 border border-border/40 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <label htmlFor="account-username" className="text-sm font-medium text-foreground">Username</label>
                        <p className="text-xs text-muted-foreground mt-1">Your unique account identifier inside Linktery.</p>
                      </div>
                      {usernameLocked && (
                        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-500">
                          {usernameDaysRemaining}d cooldown
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="account-username"
                        type="text"
                        value={accountUsername}
                        onChange={(e) => setAccountUsername(
                          e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 22)
                        )}
                        disabled={usernameLocked}
                        maxLength={22}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="username"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      3–22 characters. You can change your username once every 21 days.
                      {usernameLocked && ` Next change available ${new Date(usernameUnlockAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-5 py-4 bg-surface/40 border border-border/40 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Sign-in email</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Used for authentication and account recovery.</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground truncate max-w-[45%]">{user?.email}</span>
                  </div>

                  <div className="flex items-center justify-between px-5 py-4 bg-surface/40 border border-border/40 rounded-2xl">
                    <span className="text-sm font-medium text-foreground">Member since</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{user?.created ? new Date(user.created).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</span>
                    </div>
                  </div>

                  {/* Save account button */}
                  <button
                    onClick={handleSaveAccount}
                    disabled={savingAccount || (usernameLocked && accountUsername !== user?.username)}
                    className="btn-primary-glow text-sm !py-2.5 flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* ============ SECURITY ============ */}
            {active === "security" && (
              <div className="space-y-8">
                {/* Section header */}
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Security</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage your account security and password.</p>
                </div>

                {/* Password Change form */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Change Password</h3>

                  <div className="space-y-3 p-5 bg-surface/40 border border-border/40 rounded-2xl">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Current Password</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm"
                      />
                    </div>
                    <button
                      onClick={handleUpdatePassword}
                      disabled={loadingPassword}
                      className="btn-primary-glow text-sm !py-2.5 flex items-center gap-2 mt-1"
                    >
                      {loadingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============ API ACCESS ============ */}
            {active === "api" && <ApiAccessSettings />}

            {/* ============ BILLING ============ */}
            {active === "billing" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Plan & Billing</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage your plan, renewal, promo codes, and payment history.</p>
                </div>

                {/* Current Plan Block */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Current Plan</h3>
                  <div className="p-5 bg-surface/40 border border-border/40 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                          <PlanIcon className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-base">{plan?.name || 'Creator'} Plan</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${plan?.price || 0}/month • {plan?.limits?.links === -1 ? "Unlimited" : `Up to ${plan?.limits?.links || 5}`} smart links
                          </p>
                          {userPlan !== "creator" && user?.plan_expires_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {subStatus === "canceling" ? "Access until" : "Current period ends"}{" "}
                              {formatBillingDate(user.plan_expires_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                        subStatus === "canceling"
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-green-500/10 border-green-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          subStatus === "canceling" ? "bg-amber-500" : "bg-green-500"
                        }`} />
                        <span className={`text-xs font-bold uppercase tracking-wide ${
                          subStatus === "canceling" ? "text-amber-500" : "text-green-500"
                        }`}>
                          {userPlan === "creator" ? "Free" : subStatus === "canceling" ? "Canceling" : "Active"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      {hasStripeCustomer && (
                        <button
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                          className="px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-medium hover:bg-accent/90 flex items-center gap-2 transition-all text-sm disabled:opacity-50"
                        >
                          {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage Subscription"}
                        </button>
                      )}
                      <Link
                        to="/dashboard/pricing"
                        className="px-5 py-2.5 rounded-xl bg-background border border-border text-foreground font-medium hover:border-accent hover:text-accent flex items-center gap-2 transition-all text-sm group"
                      >
                        Modify Plan
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>

                    {subStatus === "canceling" && (
                      <p className="text-sm text-amber-500 font-medium bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl">
                        Auto-renewal is off. Premium access remains available through the current period end shown above.
                      </p>
                    )}

                    {subStatus === "active" && hasStripeCustomer && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/30">
                        <p className="text-sm text-muted-foreground">You can turn off renewal without losing current-period access.</p>
                        <CancelRenewalButton
                          className="shrink-0"
                          onCanceled={async () => {
                            setBillingRevision((value) => value + 1);
                            await refreshUser();
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Promo Code</h3>

                  {hasUsedPromocode ? (
                    <div className="flex items-center gap-4 p-5 rounded-2xl border border-accent/20 bg-accent/5">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">Promo code claimed</p>
                        <p className="text-xs text-muted-foreground mt-0.5">This account has already used its one-time promotional reward.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-surface/40 border border-border/40 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-accent" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Have a promo code?</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Apply it to this Linktery account.</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={promocode}
                          onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm"
                          placeholder="Enter code"
                        />
                        <button
                          onClick={handleApplyPromocode}
                          disabled={loadingPromocode || !promocode.trim()}
                          className="btn-primary-glow text-sm !py-2.5 flex items-center gap-2 sm:min-w-[100px] justify-center"
                        >
                          {loadingPromocode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment History */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Payment History</h3>
                  <div className="bg-surface/40 border border-border/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-background/30 text-muted-foreground">
                          <tr>
                            <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Plan</th>
                            <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Price</th>
                            <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Method</th>
                            <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Period Start</th>
                            <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">Period End</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {billingLoading ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                              </td>
                            </tr>
                          ) : billingLogs.length > 0 ? (
                            billingLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-background/20 transition-colors">
                                <td className="px-5 py-3.5 text-foreground font-medium capitalize">{log.plan}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    log.status === "active"
                                      ? "bg-green-500/10 text-green-500"
                                      : log.status === "canceling"
                                        ? "bg-amber-500/10 text-amber-500"
                                        : "bg-red-500/10 text-red-500"
                                  }`}>
                                    {log.status === "active" ? "Active" : log.status === "canceling" ? "Canceling" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-muted-foreground">${log.amount}</td>
                                <td className="px-5 py-3.5">
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-foreground/5 text-muted-foreground border border-border/50">
                                    {log.payment_method || "Given"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-muted-foreground">{formatBillingDate(log.period_start)}</td>
                                <td className="px-5 py-3.5 text-muted-foreground">{formatBillingDate(log.end_date)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground italic text-sm">
                                No payment logs yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============ CUSTOM DOMAIN (Coming Soon placeholder) ============ */}
            {active === "domains" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Custom Domain</h2>
                  <p className="text-sm text-muted-foreground mt-1">Connect your own domain for fully branded short links.</p>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface/60 border border-border/40 flex items-center justify-center mb-4">
                    <Globe className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">Custom Domains are coming soon</p>
                  <p className="text-muted-foreground/60 text-xs mt-1.5 max-w-xs">Use your own domain to create fully branded short links.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
