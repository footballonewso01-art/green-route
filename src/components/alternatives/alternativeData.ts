import competitorsData from "@/data/competitors.json";
import { alternativeReviews } from "./alternativeReviews";

const unknownFacts = {
  free: "Confirm current availability",
  paid: "Confirm current plan",
  domains: "Confirm domain entitlement",
  branding: "Confirm branding entitlement",
  routing: "Confirm required rule types",
  apps: "Confirm supported app handoffs",
  analytics: "Confirm dimensions and retention",
  fees: "Confirm selling and processor terms",
};

export const competitors = competitorsData.map(({ slug, name, emoji, alternativeSeoTitle, alternativeSeoDescription }) => {
  const review = alternativeReviews[slug];
  if (!review) throw new Error(`Missing alternative review: ${slug}`);
  return {
    slug, name, emoji, ...review,
    facts: { ...unknownFacts, ...review.facts },
    alternativeSeoTitle,
    alternativeSeoDescription,
    reviewedAt: "2026-08-31",
  };
});

export const comparisonCriteria = [
  { label: "Page", description: "Layout control and brand presentation" },
  { label: "Traffic", description: "Country, device, and destination rules" },
  { label: "Measure", description: "Clicks, campaign context, and reporting" },
  { label: "Own", description: "Domains, branding, and workspace control" },
] as const;
