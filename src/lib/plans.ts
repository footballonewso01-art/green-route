export type PlanType = "creator" | "pro" | "agency";

export interface PlanLimits {
    links: number;
    analytics: boolean;
    cloaking: boolean;
    custom_domain: boolean;
    priority_support: boolean;
    team_access: boolean;
    profile_customization: boolean;
    deep_links: boolean;
    geo_targeting: boolean;
    device_targeting: boolean;
    remove_branding: boolean;
    custom_slug: boolean;
    multi_accounts?: boolean; // Agency only
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

export const FEATURES_ACCESS = {
    direct_link: ["pro", "agency"],
    multi_links: ["pro", "agency"],
    analytics: ["pro", "agency"],
    priority_support: ["agency"],
    team_access: ["agency"],
    profile_customization: ["creator", "pro", "agency"],
    remove_branding: ["pro", "agency"],
    geo_targeting: ["creator", "pro", "agency"],
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
            { text: "3 Smart Links", icon: "🔗", tooltip: "Now includes 3 Smart Links on Free plan!" },
            { text: "Full Profile Customization", icon: "👤", tooltip: "Avatar, bio, and custom themes now free." },
            { text: "Geo Targeting", icon: "🌍", tooltip: "Redirect users by country for free." },
            { text: "Standard Support", icon: "💬" }
        ],
        limits: {
            links: 3,
            analytics: false,
            cloaking: false,
            custom_domain: false,
            priority_support: false,
            team_access: false,
            profile_customization: true,
            deep_links: false,
            geo_targeting: true,
            device_targeting: false,
            remove_branding: false,
            custom_slug: false
        }
    },
    pro: {
        id: "pro",
        name: "Creator Pro",
        price: 9,
        description: "Advanced tools for growing creators.",
        popular: true,
        buttonText: "Upgrade to Pro",
        features: [
            { text: "10 Smart Links", icon: "🔗" },
            { text: "Remove GreenRoute Branding", icon: "✨", tooltip: "Clean links without our badge." },
            { text: "Deep Links (Direct)", icon: "⚡", tooltip: "Create direct links for max speed." },
            { text: "Advanced Analytics", icon: "📊" },
            { text: "Link Optimization", icon: "🛡️" },
            { text: "Device Targeting", icon: "📱" }
        ],
        limits: {
            links: 10,
            analytics: true,
            cloaking: true,
            custom_domain: true,
            priority_support: false,
            team_access: false,
            profile_customization: true,
            deep_links: true,
            geo_targeting: true,
            device_targeting: true,
            remove_branding: true,
            custom_slug: false
        }
    },
    agency: {
        id: "agency",
        name: "Agency",
        price: 29,
        description: "For teams and agencies managing multiple brands.",
        buttonText: "Upgrade to Agency",
        features: [
            { text: "Unlimited Links", icon: "🚀" },
            { text: "Custom Slugs (e.g. /my-link)", icon: "✍️", tooltip: "Create your own short link handles." },
            { text: "Everything in Pro", icon: "✅" },
            { text: "Priority Support", icon: "⚡" },
            { text: "Team Access", icon: "👥" }
        ],
        limits: {
            links: -1,
            analytics: true,
            cloaking: true,
            custom_domain: true,
            priority_support: true,
            team_access: true,
            profile_customization: true,
            deep_links: true,
            geo_targeting: true,
            device_targeting: true,
            remove_branding: true,
            custom_slug: true,
            multi_accounts: true
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
