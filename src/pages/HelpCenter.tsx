import { useState, useMemo } from "react";
import {
    Search, ChevronDown, ChevronRight, Rocket, Link2, BarChart3, Zap, User,
    CreditCard, HelpCircle, BookOpen, ThumbsUp, ThumbsDown, ExternalLink,
    Globe, Smartphone, Shield, Target, Shuffle, Clock, Palette, Share2,
    ArrowUpRight, Sparkles
} from "lucide-react";

interface Article {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
    tags: string[];
}

interface Category {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    articles: Article[];
}

const helpCategories: Category[] = [
    {
        id: "getting-started",
        title: "Getting Started",
        description: "Learn the basics of Linktery",
        icon: Rocket,
        color: "text-emerald-400",
        articles: [
            {
                id: "create-account",
                title: "Creating Your Account",
                icon: User,
                tags: ["account", "register", "signup", "start"],
                content: (
                    <div className="space-y-4">
                        <p>Getting started with Linktery takes less than 30 seconds.</p>
                        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                            <li>Go to <strong className="text-foreground">linktery.com</strong> and click <strong className="text-foreground">Get Started Free</strong></li>
                            <li>Enter your <strong className="text-foreground">name, email, and password</strong></li>
                            <li>Accept the Terms & Conditions</li>
                            <li>Click <strong className="text-foreground">Create Account</strong> — you're in!</li>
                        </ol>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 mt-4">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>The free Creator plan includes 3 Smart Links, full profile customization, and device targeting — no credit card required.</span></p>
                        </div>
                    </div>
                ),
            },
            {
                id: "dashboard-overview",
                title: "Dashboard Overview",
                icon: BookOpen,
                tags: ["dashboard", "navigation", "overview", "home"],
                content: (
                    <div className="space-y-4">
                        <p>Your dashboard is the control center for everything in Linktery.</p>
                        <div className="space-y-3 text-muted-foreground">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0 mt-0.5">1</div>
                                <p><strong className="text-foreground">Dashboard Home</strong> — Quick stats, recent links, and activity overview.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0 mt-0.5">2</div>
                                <p><strong className="text-foreground">Links</strong> — Create, edit, and manage all your smart links.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0 mt-0.5">3</div>
                                <p><strong className="text-foreground">Analytics</strong> — Detailed click data with geo, device, and source breakdowns (Pro+).</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0 mt-0.5">4</div>
                                <p><strong className="text-foreground">Profile</strong> — Customize your public link-in-bio page.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0 mt-0.5">5</div>
                                <p><strong className="text-foreground">Settings</strong> — Account preferences, username, and security.</p>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: "first-link",
                title: "Creating Your First Link",
                icon: Link2,
                tags: ["create", "link", "first", "new", "start"],
                content: (
                    <div className="space-y-4">
                        <p>Smart Links are the core of Linktery. Here's how to create one:</p>
                        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                            <li>Go to <strong className="text-foreground">Links</strong> in the sidebar</li>
                            <li>Click <strong className="text-foreground">Create Link</strong></li>
                            <li>Enter the <strong className="text-foreground">destination URL</strong> — where you want people to go</li>
                            <li>Optionally add a <strong className="text-foreground">title</strong> and <strong className="text-foreground">icon</strong></li>
                            <li>Toggle any advanced features you need (Deeplinks, Geo Targeting, etc.)</li>
                            <li>Hit <strong className="text-foreground">Create Smart Link</strong></li>
                        </ol>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 mt-4">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Your link will be available at <strong>linktery.com/your-slug</strong>. Share it anywhere!</span></p>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: "smart-links",
        title: "Smart Links",
        description: "Link creation & management",
        icon: Link2,
        color: "text-blue-400",
        articles: [
            {
                id: "link-types",
                title: "Link Modes Explained",
                icon: Shuffle,
                tags: ["mode", "redirect", "direct", "landing", "smart", "type"],
                content: (
                    <div className="space-y-4">
                        <p>Linktery supports different link modes to control how visitors experience your redirect:</p>
                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">🔄 Redirect (Default)</h4>
                                <p className="text-sm text-muted-foreground">Instant redirect to the destination URL. Fastest option, invisible to the visitor.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">⚡ Deeplink (Direct)</h4>
                                <p className="text-sm text-muted-foreground">When clicked from Instagram/TikTok, tries to open the link in the system browser (Safari/Chrome) instead of the in-app browser. Available on Pro+.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">🛡️ Security Check (Interstitial)</h4>
                                <p className="text-sm text-muted-foreground">Shows a verification screen before redirecting. Helps filter bots and adds a layer of protection for sensitive links.</p>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: "custom-slugs",
                title: "Custom Slugs",
                icon: ExternalLink,
                tags: ["slug", "custom", "url", "short", "vanity"],
                content: (
                    <div className="space-y-4">
                        <p>Custom slugs let you choose your own short link handle instead of a random string.</p>
                        <p className="text-muted-foreground">Instead of <code className="px-2 py-1 rounded bg-surface border border-border text-accent text-xs">linktery.com/x8k2mf9p</code>, you get:</p>
                        <p className="text-center text-lg font-bold text-accent py-3">linktery.com/my-brand</p>
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-sm text-amber-400 flex items-start gap-2"><Shield className="w-4 h-4 mt-0.5 shrink-0" /> <span>Custom slugs are available on the <strong>Agency plan</strong>. Creator and Pro plans use auto-generated slugs.</span></p>
                        </div>
                    </div>
                ),
            },
            {
                id: "link-scheduling",
                title: "Link Scheduling",
                icon: Clock,
                tags: ["schedule", "date", "expire", "start", "time"],
                content: (
                    <div className="space-y-4">
                        <p>Schedule links to activate or expire automatically on specific dates.</p>
                        <div className="space-y-3 text-muted-foreground">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-xs shrink-0 mt-0.5">▶</div>
                                <p><strong className="text-foreground">Start Date</strong> — Link won't work until this date. Visitors see "not yet active" before then.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-xs shrink-0 mt-0.5">■</div>
                                <p><strong className="text-foreground">Expiry Date</strong> — Link automatically stops working after this date. Perfect for limited-time offers.</p>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: "ab-testing",
                title: "A/B Split Testing",
                icon: Shuffle,
                tags: ["ab", "split", "test", "variant", "compare"],
                content: (
                    <div className="space-y-4">
                        <p>Test multiple destination URLs with a single link. Traffic is split randomly between all variants.</p>
                        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                            <li>Enable <strong className="text-foreground">A/B Split Test</strong> when creating a link</li>
                            <li>Add your <strong className="text-foreground">variant URLs</strong> (up to 5)</li>
                            <li>Each visitor gets randomly redirected to one of the variants</li>
                            <li>Use <strong className="text-foreground">Analytics</strong> to compare click performance</li>
                        </ol>
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-sm text-amber-400 flex items-start gap-2"><Shield className="w-4 h-4 mt-0.5 shrink-0" /> <span>A/B Testing is available on the <strong>Agency plan</strong>.</span></p>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: "analytics",
        title: "Analytics",
        description: "Understand your click data",
        icon: BarChart3,
        color: "text-purple-400",
        articles: [
            {
                id: "understanding-clicks",
                title: "Understanding Click Analytics",
                icon: BarChart3,
                tags: ["clicks", "analytics", "data", "stats", "reports"],
                content: (
                    <div className="space-y-4">
                        <p>Linktery tracks every click on your links and provides real-time insights.</p>
                        <div className="space-y-3 text-muted-foreground">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0 mt-0.5">📍</div>
                                <p><strong className="text-foreground">Geo Data</strong> — See which countries your clicks come from using IP-based geolocation.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0 mt-0.5">📱</div>
                                <p><strong className="text-foreground">Device & OS</strong> — Breakdown by Mobile/Desktop/Tablet and iOS/Android/Windows.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0 mt-0.5">🌐</div>
                                <p><strong className="text-foreground">Browser & Source</strong> — Know if clicks come from Instagram, TikTok, Chrome, Safari, etc.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-xs font-bold shrink-0 mt-0.5">📊</div>
                                <p><strong className="text-foreground">Unique vs Total</strong> — Track unique visitors per day vs. total click count.</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 mt-4">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Analytics are available on <strong>Creator Pro</strong> and <strong>Agency</strong> plans.</span></p>
                        </div>
                    </div>
                ),
            },
            {
                id: "tracking-pixels",
                title: "Tracking Pixels (FB, Google, TikTok)",
                icon: Target,
                tags: ["pixel", "facebook", "google", "tiktok", "tracking", "retargeting", "meta"],
                content: (
                    <div className="space-y-4">
                        <p>Add tracking pixels to your links to build retargeting audiences and track conversions.</p>
                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">📘 Facebook/Meta Pixel</h4>
                                <p className="text-sm text-muted-foreground">Enter your Pixel ID to track Facebook ad conversions and build custom audiences.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">📊 Google Analytics</h4>
                                <p className="text-sm text-muted-foreground">Paste your GA4 Measurement ID (G-XXXXX) to track link traffic in Google Analytics.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">🎵 TikTok Pixel</h4>
                                <p className="text-sm text-muted-foreground">Add your TikTok Pixel ID to optimize ad campaigns with conversion data.</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 mt-4">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Tracking pixels are available on <strong>Creator Pro</strong> and <strong>Agency</strong> plans.</span></p>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: "advanced",
        title: "Advanced Features",
        description: "Deeplinks, targeting & cloaking",
        icon: Zap,
        color: "text-amber-400",
        articles: [
            {
                id: "deeplinks",
                title: "Deeplinks — How They Work",
                icon: Zap,
                tags: ["deeplink", "deep", "instagram", "tiktok", "browser", "direct", "in-app"],
                content: (
                    <div className="space-y-4">
                        <p>Deeplinks solve the #1 problem for creators and marketers: <strong className="text-foreground">in-app browsers</strong>.</p>
                        <p className="text-muted-foreground">When someone clicks your link in Instagram or TikTok, it opens their built-in browser which has limited functionality (no saved passwords, no extensions, poor cookie support). Deeplinks bypass this.</p>
                        <h4 className="font-semibold text-foreground mt-6 mb-3">How it works:</h4>
                        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                            <li>Enable <strong className="text-foreground">Deeplink</strong> when creating a link</li>
                            <li>When someone opens your link from Instagram/TikTok, Linktery detects the in-app browser</li>
                            <li><strong className="text-foreground">On iOS:</strong> We use Safari URL schemes to force the link to open in Safari</li>
                            <li><strong className="text-foreground">On Android:</strong> We use Intent URLs to open the link in the default browser (Chrome, Samsung Browser, etc.)</li>
                            <li>If automatic redirect fails, a beautiful fallback page with manual instructions is shown</li>
                        </ol>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 mt-4">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Deeplink is available on <strong>Creator Pro</strong> and <strong>Agency</strong> plans.</span></p>
                        </div>
                    </div>
                ),
            },
            {
                id: "geo-targeting",
                title: "Geo Targeting",
                icon: Globe,
                tags: ["geo", "country", "location", "redirect", "targeting"],
                content: (
                    <div className="space-y-4">
                        <p>Route visitors to different URLs based on their country. Perfect for multi-region campaigns.</p>
                        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                            <li>Enable <strong className="text-foreground">Geo Targeting</strong> when creating a link</li>
                            <li>Add <strong className="text-foreground">country-specific URLs</strong> (e.g., US → amazon.com, UK → amazon.co.uk)</li>
                            <li>Visitors from those countries are automatically redirected to the correct URL</li>
                            <li>Everyone else goes to the <strong className="text-foreground">default destination</strong></li>
                        </ol>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Available on <strong>Creator Pro</strong> and <strong>Agency</strong> plans.</span></p>
                        </div>
                    </div>
                ),
            },
            {
                id: "device-targeting",
                title: "Device Targeting",
                icon: Smartphone,
                tags: ["device", "mobile", "desktop", "tablet", "targeting"],
                content: (
                    <div className="space-y-4">
                        <p>Send Mobile, Desktop, and Tablet users to different destinations from the same link.</p>
                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">📱 Mobile</h4>
                                <p className="text-sm text-muted-foreground">Send mobile users to an app download page or mobile-optimized landing page.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">💻 Desktop</h4>
                                <p className="text-sm text-muted-foreground">Desktop users get the full experience — website, dashboard, or web app.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-1">📲 Tablet</h4>
                                <p className="text-sm text-muted-foreground">Optionally send tablet users to a specific URL.</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Device targeting is <strong>free on all plans</strong>!</span></p>
                        </div>
                    </div>
                ),
            },
            {
                id: "link-cloaking",
                title: "Link Cloaking (Optimization)",
                icon: Shield,
                tags: ["cloak", "cloaking", "hide", "optimization", "safe", "bot"],
                content: (
                    <div className="space-y-4">
                        <p>Link cloaking hides your real destination URL from bots, crawlers, and competitors.</p>
                        <h4 className="font-semibold text-foreground mt-4 mb-3">What it does:</h4>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> Bots and crawlers see a <strong className="text-foreground">safe page URL</strong> instead of your real destination</li>
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> Real human visitors are redirected <strong className="text-foreground">normally</strong></li>
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> Prevents platforms from flagging your destination domain</li>
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> Protects affiliate links from being copied</li>
                        </ul>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Available on <strong>Creator Pro</strong> and <strong>Agency</strong> plans.</span></p>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: "profile",
        title: "Profile & Bio",
        description: "Your public page",
        icon: User,
        color: "text-pink-400",
        articles: [
            {
                id: "profile-customization",
                title: "Customizing Your Profile",
                icon: Palette,
                tags: ["profile", "customize", "avatar", "bio", "theme", "page"],
                content: (
                    <div className="space-y-4">
                        <p>Your public profile is a link-in-bio page where you can showcase all your links.</p>
                        <h4 className="font-semibold text-foreground mb-3">What you can customize:</h4>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Avatar</strong> — Upload a photo with built-in cropper</li>
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Display Name</strong> — Your name shown at the top</li>
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Bio</strong> — A short description of who you are</li>
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Social Links</strong> — Add Instagram, TikTok, YouTube, Twitter, and more</li>
                            <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Background</strong> — Visual theme with gradient or image</li>
                        </ul>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 mt-4">
                            <p className="text-sm text-accent flex items-start gap-2"><Sparkles className="w-4 h-4 mt-0.5 shrink-0" /> <span>Profile customization is <strong>free on all plans</strong>!</span></p>
                        </div>
                    </div>
                ),
            },
            {
                id: "public-profile",
                title: "Your Public Profile URL",
                icon: Share2,
                tags: ["public", "url", "share", "profile", "linktery.com"],
                content: (
                    <div className="space-y-4">
                        <p>Your public profile is accessible at:</p>
                        <p className="text-center text-lg font-bold text-accent py-3">linktery.com/your-username</p>
                        <p className="text-muted-foreground">Only links marked as <strong className="text-foreground">"Show on Profile"</strong> appear on your public page. You can toggle this per link when creating or editing.</p>
                        <div className="p-4 rounded-xl bg-surface border border-border mt-4">
                            <p className="text-sm text-muted-foreground"><strong className="text-foreground">Pro tip:</strong> Share your profile link in your social media bios to drive traffic to all your links at once.</p>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: "plans-billing",
        title: "Plans & Billing",
        description: "Pricing, upgrades & FAQs",
        icon: CreditCard,
        color: "text-cyan-400",
        articles: [
            {
                id: "plan-comparison",
                title: "Plan Comparison",
                icon: CreditCard,
                tags: ["plan", "pricing", "compare", "creator", "pro", "agency", "free"],
                content: (
                    <div className="space-y-4">
                        <p>Linktery offers 3 plans to fit every stage of your growth:</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Feature</th>
                                        <th className="text-center py-3 px-4 text-foreground font-bold">Creator <span className="text-muted-foreground font-normal">(Free)</span></th>
                                        <th className="text-center py-3 px-4 text-accent font-bold">Pro <span className="text-muted-foreground font-normal">($9/mo)</span></th>
                                        <th className="text-center py-3 px-4 text-blue-400 font-bold">Agency <span className="text-muted-foreground font-normal">($29/mo)</span></th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Smart Links</td><td className="text-center">3</td><td className="text-center">15</td><td className="text-center">Unlimited</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Analytics</td><td className="text-center">—</td><td className="text-center text-accent">✓</td><td className="text-center text-accent">✓</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Deeplinks</td><td className="text-center">—</td><td className="text-center text-accent">✓</td><td className="text-center text-accent">✓</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Geo Targeting</td><td className="text-center">—</td><td className="text-center text-accent">✓</td><td className="text-center text-accent">✓</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Tracking Pixels</td><td className="text-center">—</td><td className="text-center text-accent">✓</td><td className="text-center text-accent">✓</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Link Cloaking</td><td className="text-center">—</td><td className="text-center text-accent">✓</td><td className="text-center text-accent">✓</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Remove Branding</td><td className="text-center">—</td><td className="text-center text-accent">✓</td><td className="text-center text-accent">✓</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">Custom Slugs</td><td className="text-center">—</td><td className="text-center">—</td><td className="text-center text-accent">✓</td></tr>
                                    <tr className="border-b border-border/50"><td className="py-2.5 px-4">A/B Testing</td><td className="text-center">—</td><td className="text-center">—</td><td className="text-center text-accent">✓</td></tr>
                                    <tr><td className="py-2.5 px-4">Custom Domains</td><td className="text-center">—</td><td className="text-center">—</td><td className="text-center text-accent">✓</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                ),
            },
            {
                id: "upgrade-downgrade",
                title: "Upgrading & Downgrading",
                icon: ArrowUpRight,
                tags: ["upgrade", "downgrade", "change", "plan", "switch"],
                content: (
                    <div className="space-y-4">
                        <p>You can change your plan at any time from the <strong className="text-foreground">Pricing</strong> page in your dashboard.</p>
                        <div className="space-y-3 text-muted-foreground">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-xs shrink-0 mt-0.5">↑</div>
                                <p><strong className="text-foreground">Upgrading</strong> — Takes effect immediately. You get instant access to all new features.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 text-xs shrink-0 mt-0.5">↓</div>
                                <p><strong className="text-foreground">Downgrading</strong> — Takes effect at the end of your current billing cycle. You keep your features until then.</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-surface border border-border mt-4">
                            <p className="text-sm text-muted-foreground"><strong className="text-foreground">Note:</strong> When downgrading, links above your new plan's limit will be deactivated. You can choose which ones to keep.</p>
                        </div>
                    </div>
                ),
            },
            {
                id: "billing-faq",
                title: "Billing FAQ",
                icon: HelpCircle,
                tags: ["billing", "payment", "refund", "cancel", "money", "faq"],
                content: (
                    <div className="space-y-4">
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-2">What payment methods do you accept?</h4>
                                <p className="text-sm text-muted-foreground">We accept all major credit cards and PayPal through our payment processor.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-2">Can I get a refund?</h4>
                                <p className="text-sm text-muted-foreground">Yes, we offer a <strong className="text-foreground">30-day money-back guarantee</strong> on all paid plans. Contact us at contact@linktery.com.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-2">Is there a free trial?</h4>
                                <p className="text-sm text-muted-foreground">The <strong className="text-foreground">Creator plan is free forever</strong> — no trial needed. Start using Linktery right away and upgrade when you need more power.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-surface border border-border">
                                <h4 className="font-semibold text-foreground mb-2">Can I cancel anytime?</h4>
                                <p className="text-sm text-muted-foreground">Absolutely. Cancel from your Billing page at any time. Your plan stays active until the end of the billing period.</p>
                            </div>
                        </div>
                    </div>
                ),
            },
        ],
    },
];

export default function HelpCenter() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [openArticles, setOpenArticles] = useState<Set<string>>(new Set());
    const [helpfulArticles, setHelpfulArticles] = useState<Record<string, boolean | null>>({});

    const toggleArticle = (id: string) => {
        setOpenArticles((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return helpCategories;
        const q = searchQuery.toLowerCase();
        return helpCategories.map((cat) => ({
            ...cat,
            articles: cat.articles.filter(
                (a) =>
                    a.title.toLowerCase().includes(q) ||
                    a.tags.some((t) => t.includes(q)) ||
                    cat.title.toLowerCase().includes(q)
            ),
        })).filter((cat) => cat.articles.length > 0);
    }, [searchQuery]);

    const totalArticles = helpCategories.reduce((sum, c) => sum + c.articles.length, 0);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="text-center space-y-4 pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm">
                    <HelpCircle className="w-4 h-4" /> Help Center
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    How can we <span className="bg-gradient-to-r from-accent to-emerald-300 bg-clip-text text-transparent">help?</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                    Guides, tutorials, and answers to help you get the most out of Linktery.
                </p>
            </div>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-0 bg-accent/5 blur-2xl rounded-full" />
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
                        placeholder="Search articles... (e.g. deeplinks, analytics, pricing)"
                        className="w-full pl-14 pr-6 py-4 bg-surface border border-border rounded-2xl text-base focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-muted-foreground/50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                        >
                            Clear
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                        {filteredCategories.reduce((s, c) => s + c.articles.length, 0)} result(s) found
                    </p>
                )}
            </div>

            {/* Category Grid */}
            {!searchQuery && !activeCategory && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {helpCategories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className="group p-6 bg-surface border border-border rounded-2xl text-left hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mb-4 group-hover:border-accent/30 transition-colors">
                                <cat.icon className={`w-6 h-6 ${cat.color} transition-transform group-hover:scale-110`} />
                            </div>
                            <h3 className="font-bold text-foreground mb-1">{cat.title}</h3>
                            <p className="text-sm text-muted-foreground">{cat.description}</p>
                            <p className="text-xs text-muted-foreground/50 mt-3">{cat.articles.length} articles</p>
                        </button>
                    ))}
                </div>
            )}

            {/* Category Header (when a category is selected) */}
            {activeCategory && !searchQuery && (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← All Categories
                    </button>
                    <span className="text-border">/</span>
                    <span className="text-sm font-bold text-foreground">
                        {helpCategories.find((c) => c.id === activeCategory)?.title}
                    </span>
                </div>
            )}

            {/* Articles */}
            {(activeCategory || searchQuery) && (
                <div className="space-y-4">
                    {filteredCategories
                        .filter((c) => !activeCategory || c.id === activeCategory)
                        .map((cat) => (
                            <div key={cat.id} className="space-y-3">
                                {searchQuery && (
                                    <div className="flex items-center gap-2 px-1">
                                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{cat.title}</h3>
                                    </div>
                                )}
                                {cat.articles.map((article) => {
                                    const isOpen = openArticles.has(article.id);
                                    return (
                                        <div
                                            key={article.id}
                                            className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? "border-accent/30 shadow-lg shadow-accent/5" : "border-border hover:border-border/80"}`}
                                        >
                                            <button
                                                onClick={() => toggleArticle(article.id)}
                                                className="w-full flex items-center gap-4 p-5 text-left"
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? "bg-accent/10" : "bg-background border border-border"}`}>
                                                    <article.icon className={`w-5 h-5 transition-colors ${isOpen ? "text-accent" : "text-muted-foreground"}`} />
                                                </div>
                                                <span className={`flex-1 font-semibold text-sm md:text-base transition-colors ${isOpen ? "text-accent" : "text-foreground"}`}>
                                                    {article.title}
                                                </span>
                                                {isOpen ? (
                                                    <ChevronDown className="w-5 h-5 text-accent shrink-0 transition-transform" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 transition-transform" />
                                                )}
                                            </button>

                                            {isOpen && (
                                                <div className="px-5 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="ml-14 text-sm text-muted-foreground leading-relaxed">
                                                        {article.content}
                                                    </div>

                                                    {/* Helpful feedback */}
                                                    <div className="ml-14 mt-6 pt-4 border-t border-border/50 flex items-center gap-4">
                                                        <span className="text-xs text-muted-foreground/60">Was this helpful?</span>
                                                        <button
                                                            onClick={() => setHelpfulArticles((p) => ({ ...p, [article.id]: true }))}
                                                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${helpfulArticles[article.id] === true ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:border-accent/20 hover:text-foreground"}`}
                                                        >
                                                            <ThumbsUp className="w-3 h-3" /> Yes
                                                        </button>
                                                        <button
                                                            onClick={() => setHelpfulArticles((p) => ({ ...p, [article.id]: false }))}
                                                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${helpfulArticles[article.id] === false ? "bg-red-500/10 border-red-500/30 text-red-400" : "border-border text-muted-foreground hover:border-red-500/20 hover:text-foreground"}`}
                                                        >
                                                            <ThumbsDown className="w-3 h-3" /> No
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                </div>
            )}

            {/* Empty state */}
            {searchQuery && filteredCategories.reduce((s, c) => s + c.articles.length, 0) === 0 && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">No articles found</h3>
                    <p className="text-muted-foreground text-sm">Try searching with different keywords or browse categories.</p>
                </div>
            )}

            {/* Bottom Stats + Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-foreground">{totalArticles}</p>
                        <p className="text-sm text-muted-foreground">Help articles available</p>
                    </div>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground mb-0.5">Still need help?</p>
                        <p className="text-sm text-muted-foreground">
                            Contact us at{" "}
                            <a href="mailto:contact@linktery.com" className="text-accent hover:underline font-medium">
                                contact@linktery.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
