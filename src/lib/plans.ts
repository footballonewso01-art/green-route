export type PlanType = "creator" | "pro" | "agency";

export interface PlanLimits {
    links: number;
    analytics: boolean;
    cloaking: boolean;
    custom_domain: number;
    priority_support: boolean;
    team_access: boolean;
    profile_customization: boolean;
    deep_links: boolean;
    geo_targeting: boolean;
    device_targeting: boolean;
    remove_branding: boolean;
    custom_slug: boolean;
    pixels: boolean;
    ab_testing: boolean;
    multi_accounts?: boolean; // Agency only
    social_links: number;
    public_profiles: number;
}

export interface PlanDetails {
    id: PlanType;
    name: string;
    price: number;
    description: string;
    popular?: boolean;
    buttonText: string;
    features: { text: string; icon: string; tooltip?: string }[];
    limits: PlanLimits;
}

export function getPublicProfileFeatureCopy(limit: number) {
    const profileLabel = limit === 1 ? "Public Profile" : "Public Profiles";
    const allowance = limit === 1 ? "one" : `up to ${limit}`;
    const ownership = limit === 1 ? "its own" : "separate";

    return {
        text: `${limit} ${profileLabel}`,
        tooltip: `Create and manage ${allowance} ${profileLabel} with ${ownership} links, socials, and design.`
    };
}

export const FEATURES_ACCESS = {
    direct_link: ["pro", "agency"],
    multi_links: ["pro", "agency"],
    analytics: ["pro", "agency"],
    priority_support: ["agency"],
    team_access: [],
    profile_customization: ["creator", "pro", "agency"],
    remove_branding: ["pro", "agency"],
    geo_targeting: ["pro", "agency"],
    device_targeting: ["creator", "pro", "agency"],
    pixels: ["pro", "agency"],
    ab_testing: ["agency"],
    custom_slug: ["agency"]
};

export const PLANS: Record<PlanType, PlanDetails> = {
    creator: {
        id: "creator",
        name: "Creator",
        price: 0,
        description: "Perfect for getting started",
        buttonText: "Current Plan",
        features: [
            { text: "3 Smart Links", icon: "🔗", tooltip: "Includes 3 Smart Links on Free plan." },
            { ...getPublicProfileFeatureCopy(1), icon: "👤" },
            { text: "Full Profile Customization", icon: "👤", tooltip: "Avatar, bio, and custom themes now free." },
            { text: "Device Targeting", icon: "📱", tooltip: "Redirect users by their device type for free." },
            { text: "Security Check", icon: "🛡️", tooltip: "Protective verification page before every redirect." },
            { text: "Domain Choose List", icon: "🌐", tooltip: "Select from a curated pool of domains to host your smart links." }
        ],
        limits: {
            links: 3,
            analytics: false,
            cloaking: false,
            custom_domain: 0,
            priority_support: false,
            team_access: false,
            profile_customization: true,
            deep_links: false,
            geo_targeting: false,
            device_targeting: true,
            remove_branding: false,
            custom_slug: false,
            pixels: false,
            ab_testing: false,
            social_links: 3,
            public_profiles: 1
        }
    },
    pro: {
        id: "pro",
        name: "Creator Pro",
        price: 11,
        description: "Advanced tools for growing creators.",
        popular: true,
        buttonText: "Upgrade to Pro",
        features: [
            { text: "15 Smart Links", icon: "🔗" },
            { ...getPublicProfileFeatureCopy(3), icon: "👥" },
            { text: "Remove Linktery Branding", icon: "✨", tooltip: "Clean links without our branding badge." },
            { text: "Deeplink", icon: "⚡", tooltip: "Smart route optimization for social app traffic." },
            { text: "Advanced Analytics", icon: "📊" },
            { text: "2 Custom Domains", icon: "🌐", tooltip: "Connect up to 2 domains to a Link or Public Profile." },
            { text: "API Access", icon: "🔌", tooltip: "Create and update Links, read Public Profiles, and pull aggregate analytics through API v1." },
            { text: "Link Optimization", icon: "🛡️" },
            { text: "Geo Targeting", icon: "🌍" }
        ],
        limits: {
            links: 15,
            analytics: true,
            cloaking: true,
            custom_domain: 2,
            priority_support: false,
            team_access: false,
            profile_customization: true,
            deep_links: true,
            geo_targeting: true,
            device_targeting: true,
            remove_branding: true,
            custom_slug: false,
            pixels: false,
            ab_testing: false,
            social_links: 3,
            public_profiles: 3
        }
    },
    agency: {
        id: "agency",
        name: "Agency",
        price: 29,
        description: "For agencies and operators managing multiple brands.",
        buttonText: "Upgrade to Agency",
        features: [
            { text: "Unlimited Smart Links", icon: "🚀" },
            { ...getPublicProfileFeatureCopy(25), icon: "👥" },
            { text: "Tracking Pixels", icon: "🎯", tooltip: "FB, Google, TikTok pixel support." },
            { text: "A/B Testing (Unlimited)", icon: "🧪", tooltip: "Compare multiple link variants simultaneously." },
            { text: "10 Custom Domains", icon: "🌐", tooltip: "Connect up to 10 domains to a Link or Public Profile." },
            { text: "Custom Slugs (e.g. /my-link)", icon: "✍️", tooltip: "Choose your own short link handles." },
            { text: "API Access", icon: "🔌", tooltip: "API v1 access with higher rate and daily usage limits." },
            { text: "Everything in Creator Pro", icon: "✅" }
        ],
        limits: {
            links: -1,
            analytics: true,
            cloaking: true,
            custom_domain: 10,
            priority_support: true,
            // Reserved for a future seats/roles product. Do not market an
            // entitlement until collaborative workspaces actually exist.
            team_access: false,
            profile_customization: true,
            deep_links: true,
            geo_targeting: true,
            device_targeting: true,
            remove_branding: true,
            custom_slug: true,
            pixels: true,
            ab_testing: true,
            multi_accounts: true,
            social_links: 3,
            public_profiles: 25
        }
    }
};

export const PLAN_RANKS: Record<PlanType, number> = {
    creator: 0,
    pro: 1,
    agency: 2
};

export function checkPlan(userPlan: string | undefined, feature: keyof PlanLimits): boolean {
    const planId = (userPlan as PlanType) || "creator";
    const plan = PLANS[planId];
    if (!plan) return false;

    const limitValue = plan.limits[feature];

    if (typeof limitValue === "boolean") {
        return limitValue;
    }

    if (typeof limitValue === "number") {
        return limitValue !== 0;
    }

    return false;
}

export function canUseResource(userPlan: string | undefined, feature: keyof PlanLimits, currentUsage: number): boolean {
    const planId = (userPlan as PlanType) || "creator";
    const plan = PLANS[planId];
    if (!plan) return false;

    const limitValue = plan.limits[feature];
    if (typeof limitValue === "number") {
        if (limitValue === -1) return true; // Unlimited
        return currentUsage < limitValue;
    }

    return true;
}
