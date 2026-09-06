export type CampaignStatus = "draft" | "active" | "paused" | "ended";
export type CampaignObjective = "signups" | "activation" | "revenue";

export interface CampaignMetrics {
  visits: number;
  unique_visitors: number;
  signups: number;
  activated: number;
  paid: number;
  revenue: number;
  promo_uses: number;
}

export interface CampaignPromocode {
  id: string;
  code: string;
  reward_enabled: boolean;
  reward_plan: string;
  reward_days: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
}

export interface MarketingPlacement {
  id: string;
  campaign_id: string;
  name: string;
  tracking_slug: string;
  tracking_url: string;
  content_key: string;
  source: string;
  medium: string;
  landing_path: string;
  cost_cents: number;
  is_active: boolean;
  notes: string;
  created: string;
  updated: string;
  metrics: CampaignMetrics;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  tracking_key: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  is_live: boolean;
  landing_path: string;
  budget_cents: number;
  spent_cents: number;
  currency: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  promocode: CampaignPromocode | null;
  placements: MarketingPlacement[];
  metrics: CampaignMetrics;
  created: string;
  updated: string;
}

export function formatCampaignMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(Math.max(0, Number(cents || 0)) / 100);
}

export function campaignRate(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

export function campaignStatusLabel(campaign: MarketingCampaign): string {
  if (campaign.is_live) return "Live";
  if (campaign.status === "active" && campaign.starts_at && new Date(campaign.starts_at) > new Date()) {
    return "Scheduled";
  }
  if (campaign.status === "active" && campaign.ends_at && new Date(campaign.ends_at) <= new Date()) {
    return "Ended";
  }
  return campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1);
}

export function campaignCostPerSignup(campaign: MarketingCampaign): number | null {
  return campaign.metrics.signups > 0 ? campaign.spent_cents / campaign.metrics.signups : null;
}
