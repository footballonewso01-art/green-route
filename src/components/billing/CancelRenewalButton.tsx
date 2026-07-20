import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { maskError } from "@/lib/utils";

type CancelRenewalButtonProps = {
  onCanceled?: (periodEnd?: string) => void | Promise<void>;
  className?: string;
};

export function CancelRenewalButton({ onCanceled, className = "" }: CancelRenewalButtonProps) {
  const [loading, setLoading] = useState(false);

  const cancelRenewal = async () => {
    const confirmed = window.confirm(
      "Turn off auto-renewal? Your current plan will stay active until the end of the paid billing period.",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await pb.send("/api/stripe/cancel-subscription", { method: "POST" });
      if (result?.success !== true || result?.cancelAtPeriodEnd !== true) {
        throw new Error("Cancellation was not confirmed");
      }

      toast.success("Auto-renewal is off. Your plan remains active through the paid period.");
      await onCanceled?.(result.periodEnd || undefined);
    } catch (error) {
      console.error("Cancel renewal error:", error);
      toast.error(maskError(error, "We couldn't turn off auto-renewal. Try again or use Manage Subscription."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={cancelRenewal}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {loading ? "Canceling renewal…" : "Cancel Renewal"}
    </button>
  );
}
