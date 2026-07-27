export type PromocodePartner = {
  id?: string;
  username?: string;
  email?: string;
};

export type PromocodeRecord = {
  id: string;
  code: string;
  max_uses: number;
  current_uses: number;
  reward_plan: string;
  reward_days: number;
  reward_enabled?: boolean;
  partner_id?: string;
  internal_name?: string;
  commission_rate_bps?: number;
  expand?: { partner_id?: PromocodePartner };
  is_active: boolean;
  created: string;
  updated?: string;
};

export type PromocodeOperationalState = "active" | "depleted" | "archived";

export function getPromocodeState(promocode: PromocodeRecord): PromocodeOperationalState {
  if (!promocode.is_active) return "archived";
  if (promocode.max_uses > 0 && promocode.current_uses >= promocode.max_uses) return "depleted";
  return "active";
}

export function getPromocodeRewardLabel(promocode: PromocodeRecord): string {
  if (promocode.reward_enabled === false || !promocode.reward_plan || promocode.reward_days <= 0) {
    return "No signup reward";
  }

  return `${promocode.reward_plan.toUpperCase()} · ${promocode.reward_days}d`;
}

export function getPromocodeCommissionRate(promocode: PromocodeRecord): number {
  return (promocode.commission_rate_bps || 0) / 100;
}

export function getPromocodeRemainingUses(promocode: PromocodeRecord): number | null {
  if (promocode.max_uses === 0) return null;
  return Math.max(0, promocode.max_uses - promocode.current_uses);
}
