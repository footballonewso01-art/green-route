import { useState } from "react";
import { Lock, Globe, Key, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { checkPlan } from "@/lib/plans";
import { UpgradeModal } from "@/components/UpgradeModal";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { Loader2 } from "lucide-react";

const tabs = [
  { id: "password", label: "Password", icon: Lock, limit: null },
  { id: "domains", label: "Domains", icon: Globe, limit: "custom_domain" },
  { id: "api", label: "API Keys", icon: Key, limit: "team_access" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [active, setActive] = useState("password");
  const [upgradeModal, setUpgradeModal] = useState({ open: false, feature: "", description: "" });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const userPlan = (user as any)?.plan || "creator";

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (!tab.limit || checkPlan(userPlan, tab.limit as any)) {
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
      });
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
    } catch (error: any) {
      console.error("Password update error:", error?.response || error);

      // Parse PocketBase field-level validation errors
      const data = error?.response?.data;
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
        toast.error(error?.message || "Failed to update password. Please try again.");
      }
    } finally {
      setLoadingPassword(false);
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
          const isLocked = tab.limit && !checkPlan(userPlan, tab.limit as any);
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active === tab.id
                ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                } ${isLocked ? "opacity-60" : ""}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {isLocked && (
                <Lock className="w-3 h-3 ml-1 text-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="glass-card p-8 max-w-2xl relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

        {active === "password" && (
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
      />
    </div>
  );
}
