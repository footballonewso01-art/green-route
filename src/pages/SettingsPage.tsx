import { useState, useEffect, useRef } from "react";
import { Lock, Globe, Key, ChevronRight, Gift, CheckCircle, Camera, User, Zap, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { checkPlan, PLANS, PlanType } from "@/lib/plans";
import { UpgradeModal } from "@/components/UpgradeModal";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { Loader2 } from "lucide-react";

const tabs = [
  { id: "account", label: "Account", icon: Lock, limit: null },
  { id: "domains", label: "Domains", icon: Globe, limit: "custom_domain", comingSoon: true },
  { id: "api", label: "API Keys", icon: Key, limit: "team_access", comingSoon: true },
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [active, setActive] = useState("account");
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; description: string; planNeeded?: "pro" | "agency" }>({ open: false, feature: "", description: "" });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [promocode, setPromocode] = useState("");
  const [loadingPromocode, setLoadingPromocode] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  // Account profile editing state
  const [accountName, setAccountName] = useState(user?.name || "");
  const [accountAvatarPreview, setAccountAvatarPreview] = useState<string | null>(
    user?.avatar && user?.collectionId ? pb.files.getUrl(user as unknown as Record<string, unknown>, user.avatar) : null
  );
  const [accountAvatarFile, setAccountAvatarFile] = useState<File | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const accountAvatarRef = useRef<HTMLInputElement>(null);

  const userPlan = (user as { plan?: string })?.plan || "creator";
  const plan = PLANS[userPlan as PlanType];
  const hasUsedPromocode = !!(user as Record<string, unknown>)?.promocode_used;

  const [subStatus, setSubStatus] = useState<"active" | "canceling" | "none">("none");

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
          const status = result.items[0].status; // "active" or "canceling"
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
  }, [user, loadingCancel]);

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.comingSoon) {
      toast.info(`${tab.label} feature is coming soon!`);
      return;
    }

    if (!tab.limit || checkPlan(userPlan, tab.limit as keyof import('@/lib/plans').PlanLimits)) {
      setActive(tab.id);
    } else {
      let featureName = tab.label;
      let description = "";

      if (tab.id === "domains") {
        description = "Connect your own custom domains for fully branded short links. Available on Agency plan.";
        featureName = "Custom Domains (Agency)";
      } else if (tab.id === "api") {
        description = "Access our REST API to automate link creation and management. Available on Agency plan.";
        featureName = "API Access (Agency)";
      }

      setUpgradeModal({
        open: true,
        feature: featureName,
        description: description,
        planNeeded: "agency"
      });
    }
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
        // Refresh auth state to get updated plan and promocode_used
        await pb.collection("users").authRefresh();
        // The auth context listener should automatically update the user state
      } else {
        toast.error(res.message || "Failed to apply promocode");
      }
    } catch (err) {
      const error = err as { response?: { message?: string; error?: string }; message?: string };
      console.error("Promocode apply error:", error);
      toast.error(error?.response?.message || error?.response?.error || error?.message || "Failed to apply promocode");
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

      // Parse PocketBase field-level validation errors
      const data = err?.response?.data;
      if (data) {
        if (data.oldPassword) {
          toast.error(data.oldPassword.message || "Current password is incorrect.");
        } else if (data.password) {
          toast.error(data.password.message || "New password does not meet requirements.");
        } else if (data.passwordConfirm) {
          toast.error(data.passwordConfirm.message || "Password confirmation does not match.");
        } else {
          // Generic field error
          const firstKey = Object.keys(data)[0];
          toast.error(data[firstKey]?.message || "Failed to update password.");
        }
      } else {
        toast.error(err?.message || "Failed to update password. Please try again.");
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to turn off auto-renewal for your subscription? Your premium plan will remain active until the end of your billing cycle.")) {
      return;
    }

    setLoadingCancel(true);
    try {
      const res = await pb.send("/api/stripe/cancel-subscription", {
        method: "POST"
      });

      if (res.success) {
        toast.success(res.message || "Subscription canceled successfully");
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        toast.error(res.message || "Failed to cancel subscription");
      }
    } catch (err) {
      const error = err as { response?: { message?: string; error?: string }; message?: string };
      console.error("Cancel subscription error:", error);
      toast.error(error?.response?.message || error?.response?.error || error?.message || "Failed to cancel subscription");
    } finally {
      setLoadingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border w-fit">
        {tabs.map((tab) => {
          const isLocked = tab.limit && !checkPlan(userPlan, tab.limit as keyof import('@/lib/plans').PlanLimits);
          const isComingSoon = tab.comingSoon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active === tab.id
                ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                } ${isLocked || isComingSoon ? "opacity-50" : ""} ${isComingSoon ? "grayscale cursor-default" : ""}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {isLocked && !isComingSoon && (
                <Lock className="w-3 h-3 ml-1 text-accent" />
              )}
              {isComingSoon && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded ml-1 text-white/40 font-bold uppercase tracking-tighter">Soon</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="glass-card p-8 max-w-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

        {active === "account" && (
          <div className="space-y-8 relative z-10">
            {/* Account Info Section */}
            <div className="space-y-5 pb-6 border-b border-border/50">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                Account Info
              </h2>

              {/* Plan Badge + Account Meta */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold text-accent uppercase tracking-wide">{plan?.name || 'Creator'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Member since {user?.created ? new Date(user.created as unknown as string).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</span>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {user?.email}
                </div>
              </div>

              {/* Avatar + Name Editor */}
              <div className="flex items-start gap-6">
                {/* Avatar Upload */}
                <div className="relative group shrink-0">
                  <div
                    className="w-20 h-20 rounded-2xl bg-accent/20 border-2 border-accent/20 flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 group-hover:border-accent/50 group-hover:shadow-lg group-hover:shadow-accent/10"
                    onClick={() => accountAvatarRef.current?.click()}
                  >
                    {accountAvatarPreview ? (
                      <img src={accountAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-accent">{(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => accountAvatarRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  >
                    <Camera className="w-3.5 h-3.5" />
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

                {/* Name Field */}
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-foreground block">Display Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors"
                    placeholder="Your name"
                  />
                  <p className="text-xs text-muted-foreground">This name is shown in your dashboard header.</p>
                </div>
              </div>

              {/* Save Account Button */}
              <button
                onClick={async () => {
                  if (!user) return;
                  setSavingAccount(true);
                  try {
                    const updateData: Record<string, unknown> = { name: accountName };
                    await pb.collection('users').update(user.id, updateData, { requestKey: null });

                    if (accountAvatarFile) {
                      const fd = new FormData();
                      fd.append('avatar', accountAvatarFile);
                      await pb.collection('users').update(user.id, fd, { requestKey: null });
                      setAccountAvatarFile(null);
                    }

                    await refreshUser();
                    toast.success('Account updated successfully');
                  } catch (err) {
                    const error = err as { response?: { message?: string }; message?: string };
                    console.error('Account update error:', error);
                    toast.error(error?.response?.message || error?.message || 'Failed to update account');
                  } finally {
                    setSavingAccount(false);
                  }
                }}
                disabled={savingAccount}
                className="btn-primary-glow text-sm !py-2 flex items-center gap-2"
              >
                {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>

            {/* Promocode Section */}
            <div className="space-y-4 pb-6 border-b border-border/50">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Gift className="w-5 h-5 text-accent" />
                Promocode
              </h2>
              
              {hasUsedPromocode ? (
                <div className="flex items-center justify-between p-4 rounded-xl border border-accent/20 bg-accent/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Promocode Activated</p>
                      <p className="text-sm text-muted-foreground">You have already claimed your trial reward.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">Have a promo code? Enter it below!</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promocode}
                      onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors"
                      placeholder="Enter Code"
                    />
                    <button
                      onClick={handleApplyPromocode}
                      disabled={loadingPromocode || !promocode.trim()}
                      className="btn-primary-glow text-sm !py-2 flex items-center gap-2 min-w-[100px] justify-center"
                    >
                      {loadingPromocode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply Code"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors"
                />
              </div>
              <button
                onClick={handleUpdatePassword}
                disabled={loadingPassword}
                className="btn-primary-glow text-sm !py-2 flex items-center gap-2"
              >
                {loadingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </button>
            </div>

            {/* Cancel Subscription Section */}
            {(userPlan === "pro" || userPlan === "agency") && (
              <div className="space-y-4 pt-6 border-t border-border/50">
                <h2 className="text-lg font-semibold text-foreground">Subscription Management</h2>
                {subStatus === "canceling" ? (
                  <p className="text-sm text-amber-500 font-medium bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                    Auto-renewal is turned off. Your premium features will remain active until the end of your billing cycle.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Turn off auto-renewal for your subscription. Your premium features will remain active until the end of the current billing period.
                    </p>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={loadingCancel}
                      className="px-6 py-2.5 rounded-xl border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 font-medium transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {loadingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : "Turn Off Auto-Renewal"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {active === "domains" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Custom Domains</h2>
            <p className="text-sm text-muted-foreground">Connect your own domain for fully branded short links.</p>
            <div className="p-6 rounded-xl border border-border bg-surface/50 text-center">
              <Globe className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No custom domains connected yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add your domain below to get started.</p>
            </div>
            <div className="flex gap-2">
              <input placeholder="yourdomain.com" className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm" />
              <button className="btn-primary-glow text-sm !py-2">Add Domain</button>
            </div>
          </div>
        )}

        {active === "api" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">Use API keys to integrate Linktery with your apps.</p>
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="text-xs text-muted-foreground mb-1">Live Key</div>
              <div className="flex items-center gap-2">
                <code className="text-sm text-foreground font-mono">gr_live_••••••••••••xxyz</code>
                <button className="text-xs text-accent hover:underline">Copy</button>
              </div>
            </div>
            <button className="btn-primary-glow text-sm !py-2">Generate New Key</button>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ ...upgradeModal, open: false })}
        featureName={upgradeModal.feature}
        description={upgradeModal.description}
        planNeeded={upgradeModal.planNeeded}
      />
    </div>
  );
}
