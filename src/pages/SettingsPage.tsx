import { useState } from "react";
import { User, Lock, Globe, Key } from "lucide-react";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "password", label: "Password", icon: Lock },
  { id: "domains", label: "Domains", icon: Globe },
  { id: "api", label: "API Keys", icon: Key },
];

export default function SettingsPage() {
  const [active, setActive] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border w-fit">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActive(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active === tab.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass-card p-6 max-w-2xl">
        {active === "profile" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Profile</h2>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
              <input defaultValue="John Creator" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
              <input defaultValue="johncreator" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bio</label>
              <textarea defaultValue="Digital creator & marketer" rows={3} className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors resize-none" />
            </div>
            <button className="btn-primary-glow text-sm !py-2">Save Changes</button>
          </div>
        )}

        {active === "password" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Current Password</label>
              <input type="password" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
              <input type="password" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Password</label>
              <input type="password" className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors" />
            </div>
            <button className="btn-primary-glow text-sm !py-2">Update Password</button>
          </div>
        )}

        {active === "domains" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Custom Domains</h2>
            <p className="text-sm text-muted-foreground">Connect your own domain for branded links.</p>
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">links.mysite.com</div>
                  <div className="text-xs text-accent">Active</div>
                </div>
                <button className="text-xs text-destructive hover:underline">Remove</button>
              </div>
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
            <p className="text-sm text-muted-foreground">Use API keys to integrate GreenRoute with your apps.</p>
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
    </div>
  );
}
