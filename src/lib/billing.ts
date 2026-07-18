export type BillingRecord = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  payment_method: string;
  created: string;
  period_start?: string;
  end_date?: string;
};

export function formatBillingDate(dateStr?: string, locale = "en-US") {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
