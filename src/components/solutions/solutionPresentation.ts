import {
  BookOpen, Camera, Dumbbell, FileDown, Gamepad2, Globe, House, Images, Link2,
  MessageCircle, Mic2, Music2, Palette, QrCode, Route, ShoppingBag, Smartphone,
  Split, Store, Users, Video, WandSparkles, type LucideIcon,
} from "lucide-react";

export type SolutionGroup = "audience" | "selling" | "campaigns";
export type SolutionFilter = "all" | SolutionGroup;
export type SolutionVisual = "profile" | "store" | "routing";

interface SolutionGuide {
  id: string;
  title: string;
  label: string;
  description: string;
  path: string;
  group: SolutionGroup;
  icon: LucideIcon;
  visual?: SolutionVisual;
}

export const solutionFilters: { id: SolutionFilter; label: string }[] = [
  { id: "all", label: "All solutions" },
  { id: "audience", label: "Build an audience" },
  { id: "selling", label: "Sell online" },
  { id: "campaigns", label: "Run campaigns" },
];

// Existing public guides, not separate tools or promised integrations.
export const solutionGuides: SolutionGuide[] = [
  { id: "social-bio", title: "Give your content a home.", label: "Social bio", description: "Bring your latest work, offers, and contact links together on a page you can update as your priorities change.", path: "/solutions/bio-link-tool", group: "audience", icon: Link2, visual: "profile" },
  { id: "online-store", title: "From the feed to your store.", label: "E-commerce", description: "Share products from Shopify or another store with managed links, mobile-friendly destinations, and campaign tracking.", path: "/solutions/shopify-smart-links", group: "selling", icon: ShoppingBag, visual: "store" },
  { id: "campaign-routing", title: "One campaign. The right page.", label: "Campaign routing", description: "Send visitors to the destination that fits their country or device, with a default page for everyone else.", path: "/solutions/smart-link-redirect", group: "campaigns", icon: Route, visual: "routing" },
  { id: "ugc-portfolio", title: "Pitch your work to brands", label: "UGC portfolio", description: "Put your best content, collaboration details, and contact options into one portfolio link for your next pitch.", path: "/solutions/ugc-portfolio", group: "audience", icon: Images },
  { id: "digital-products", title: "Share your next digital product", label: "Courses & downloads", description: "Connect a launch post to your course, download, or checkout page, and see which sources bring visitors.", path: "/solutions/digital-product-smart-links", group: "selling", icon: FileDown },
  { id: "regional-campaigns", title: "Make a campaign feel local", label: "Regional campaigns", description: "Link to the right regional store or resource by country. Keep a fallback for locations without a specific destination.", path: "/solutions/geo-targeted-redirect", group: "campaigns", icon: Globe },
  { id: "music-release", title: "Give every release one link", label: "Music", description: "Bring listening destinations together and attempt supported app handoffs, so fans can continue on their preferred service.", path: "/solutions/music-smart-links", group: "audience", icon: Music2 },
  { id: "podcast-episodes", title: "Make your next episode easy to find", label: "Podcasts", description: "Share an episode across channels with podcast-app destinations, a web fallback, and click analytics.", path: "/solutions/podcast-smart-links", group: "audience", icon: Mic2 },
  { id: "app-handoffs", title: "Continue in the right app", label: "App-aware sharing", description: "Attempt supported native-app or browser handoffs from a shared link, while keeping an HTTPS fallback when opening is blocked.", path: "/solutions/deeplink-generator", group: "campaigns", icon: Smartphone },
  { id: "youtube-links", title: "Keep video links up to date", label: "YouTube", description: "Use managed links in video descriptions for offers, resources, and channels. Update destinations without editing every description.", path: "/solutions/youtube-smart-links", group: "audience", icon: Video },
  { id: "telegram-community", title: "Bring people into your channel", label: "Telegram", description: "Share a channel or community across your social pages with supported app opening and a web destination as backup.", path: "/solutions/telegram-bio-link", group: "audience", icon: MessageCircle },
  { id: "affiliate-campaigns", title: "Compare campaign destinations", label: "Affiliate campaigns", description: "Distribute traffic between destination links and review click activity before deciding which offer to use next.", path: "/solutions/affiliate-smart-link-rotator", group: "campaigns", icon: Split },
  { id: "amazon-recommendations", title: "Share product recommendations", label: "Amazon", description: "Create trackable links to Amazon products with supported mobile-app handoffs and a normal web fallback.", path: "/solutions/amazon-smart-links", group: "selling", icon: Store },
  { id: "offline-to-online", title: "Take a printed link online", label: "QR campaigns", description: "Connect cards, packaging, or menus to a managed destination you can update without printing a new QR code.", path: "/solutions/qr-code-biolink", group: "campaigns", icon: QrCode },
  { id: "creator-memberships", title: "Connect your creator channels", label: "OnlyFans", description: "Organize your public creator links and membership destinations on a branded page that keeps your sharing consistent.", path: "/solutions/onlyfans-link-in-bio", group: "audience", icon: Users },
  { id: "virtual-creators", title: "Organize a virtual creator profile", label: "Fanvue & virtual creators", description: "Bring social profiles, content, and subscription destinations together under one public identity.", path: "/solutions/fanvue-ai-models", group: "audience", icon: WandSparkles },
];

export const solutionProfessions = [
  { title: "Real estate agents", description: "Listings & enquiries", path: "/solutions/link-in-bio-for-real-estate-agents", icon: House },
  { title: "OnlyFans creators", description: "Memberships & community", path: "/solutions/link-in-bio-for-onlyfans-creators", icon: Users },
  { title: "Musicians & bands", description: "Releases & tour dates", path: "/solutions/link-in-bio-for-musicians", icon: Music2 },
  { title: "Fitness coaches", description: "Programs & bookings", path: "/solutions/link-in-bio-for-fitness-coaches", icon: Dumbbell },
  { title: "UGC creators", description: "Content & collaborations", path: "/solutions/link-in-bio-for-ugc-creators", icon: Camera },
  { title: "Gamers & streamers", description: "Streams & community", path: "/solutions/link-in-bio-for-streamers", icon: Gamepad2 },
  { title: "Photographers", description: "Portfolios & enquiries", path: "/solutions/link-in-bio-for-photographers", icon: Images },
  { title: "Podcasters", description: "Episodes & listening apps", path: "/solutions/link-in-bio-for-podcasters", icon: Mic2 },
  { title: "Authors & writers", description: "Books & new releases", path: "/solutions/link-in-bio-for-authors", icon: BookOpen },
  { title: "Artists & illustrators", description: "Work & commissions", path: "/solutions/link-in-bio-for-artists", icon: Palette },
  { title: "Beauty & fashion", description: "Looks & recommendations", path: "/solutions/link-in-bio-for-beauty-influencers", icon: ShoppingBag },
  { title: "E-commerce brands", description: "Products & campaigns", path: "/solutions/link-in-bio-for-e-commerce-brands", icon: Store },
  { title: "AI models", description: "Identity & destinations", path: "/solutions/link-in-bio-for-ai-models", icon: WandSparkles },
  { title: "AI model agencies", description: "Rosters & campaigns", path: "/solutions/link-in-bio-for-ai-agencies", icon: Users },
  { title: "VTubers", description: "Streams, merch & community", path: "/solutions/link-in-bio-for-vtubers", icon: Gamepad2 },
];
