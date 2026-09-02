import { BarChart3, Code2, Globe, Layers3, Link2, MapPin, MousePointer2, ScanLine, Shuffle, Smartphone, Type } from "lucide-react";
import { checkPlan, PLANS, type PlanLimits } from "@/lib/plans";

export const featureGroups = [
  { id: "create", label: "Create & brand", description: "Create addresses, organize destinations, and connect your own domain." },
  { id: "route", label: "Routing & destinations", description: "Control where visitors go and how they get there." },
  { id: "measure", label: "Analytics & API", description: "Read your traffic data and connect it to your workflow." },
] as const;

type VisualKind = "short-link" | "management" | "branded" | "domain" | "country" | "device" | "rotation" | "deeplink" | "analytics" | "profile-analytics" | "api";
interface FeaturePresentation {
  label: string;
  group: typeof featureGroups[number]["id"];
  icon: typeof Link2;
  visual: VisualKind;
  summary: string;
  capabilities: string[];
  entitlement?: keyof PlanLimits;
}

export const featurePresentation: Record<string, FeaturePresentation> = {
  "/features/url-shortener": { label: "URL shortener", group: "create", icon: Link2, visual: "short-link", summary: "Create a short URL and update its destination after sharing it.", capabilities: ["Editable destination", "UTM parameters"], entitlement: "links" },
  "/features/link-management": { label: "Link management", group: "create", icon: Layers3, visual: "management", summary: "Manage Smart Links, Public Profiles, and their published destinations.", capabilities: ["Link controls", "Profile editor"], entitlement: "links" },
  "/features/branded-links": { label: "Branded links", group: "create", icon: Type, visual: "branded", summary: "Choose a platform domain, personalize a slug, or use your own domain.", capabilities: ["Domain selection", "Custom addresses"] },
  "/features/custom-domains": { label: "Custom domains", group: "create", icon: Globe, visual: "domain", summary: "Connect a domain directly to one Link or Public Profile, without a /slug.", capabilities: ["DNS verification", "HTTPS"], entitlement: "custom_domain" },
  "/features/link-rotator": { label: "Link rotator", group: "route", icon: Shuffle, visual: "rotation", summary: "Randomly split visits between your destination and alternative URLs.", capabilities: ["Equal-chance split", "Editable alternatives"], entitlement: "ab_testing" },
  "/features/geo-targeting": { label: "Geo targeting", group: "route", icon: MapPin, visual: "country", summary: "Send visitors to a destination selected by their approximate country.", capabilities: ["Country rules", "Country tiers"], entitlement: "geo_targeting" },
  "/features/device-targeting": { label: "Device targeting", group: "route", icon: Smartphone, visual: "device", summary: "Set separate destinations for mobile, desktop, and tablet visitors.", capabilities: ["Three device types", "Default fallback"], entitlement: "device_targeting" },
  "/features/deep-linking": { label: "Deep linking", group: "route", icon: ScanLine, visual: "deeplink", summary: "Help visitors continue from a social app into an external browser.", capabilities: ["Browser handoff", "Manual fallback"], entitlement: "deep_links" },
  "/features/link-analytics": { label: "Link analytics", group: "measure", icon: BarChart3, visual: "analytics", summary: "Break down clicks by date, country, device, source, and campaign.", capabilities: ["Traffic reports", "UTM attribution"], entitlement: "analytics" },
  "/features/public-profile-analytics": { label: "Public Profile analytics", group: "measure", icon: MousePointer2, visual: "profile-analytics", summary: "Compare profile visits with clicks on the individual cards inside it.", capabilities: ["Profile views", "Card performance"], entitlement: "analytics" },
  "/features/public-api": { label: "Public API", group: "measure", icon: Code2, visual: "api", summary: "Manage Links, read Public Profiles, and retrieve aggregate analytics from your code.", capabilities: ["Account-scoped keys", "API v1"] },
};

export function getFeaturePresentation(path: string): FeaturePresentation {
  return featurePresentation[path] ?? featurePresentation["/features/url-shortener"];
}

export function getFeatureAvailability(path: string): string {
  if (path === "/features/branded-links") return "Availability varies by address type";
  // API access is listed in the published plans rather than the PlanLimits interface.
  if (path === "/features/public-api") return `${PLANS.pro.name} & ${PLANS.agency.name}`;
  const { entitlement } = getFeaturePresentation(path);
  if (!entitlement) return "See plan details";
  const included = Object.values(PLANS).filter((plan) => checkPlan(plan.id, entitlement));
  if (included.length === Object.keys(PLANS).length) return "All plans, including Free";
  if (entitlement === "custom_domain") return included.map((plan) => `${plan.name}: ${plan.limits.custom_domain}`).join(" · ");
  return included.map((plan) => plan.name).join(" & ");
}
