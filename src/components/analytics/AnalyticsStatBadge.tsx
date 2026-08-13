import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnalyticsStatBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: ReactNode;
  tone?: "neutral" | "accent";
}

export default function AnalyticsStatBadge({
  children,
  className,
  tone = "neutral",
  ...props
}: AnalyticsStatBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-fit shrink-0 items-center justify-center rounded-full border px-2.5 py-0 font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.12em]",
        tone === "accent"
          ? "border-accent/15 bg-accent/[0.06] text-accent/90"
          : "border-border/70 bg-background/30 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span className="translate-y-[0.5px] leading-none">{children}</span>
    </span>
  );
}
