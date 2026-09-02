import {
  BarChart3, BookOpen, Boxes, CircleUserRound, FileDown, Globe2, Images,
  Link2, MessageCircle, Mic2, Music2, QrCode, Route, ShoppingBag,
  Smartphone, Split, Store, UsersRound, Video, WandSparkles, type LucideIcon,
} from "lucide-react";
import professionsData from "@/data/professions.json";
import { SEO_PAGES, type PageSeoConfig } from "@/lib/seo-config";
import { solutionGuides, solutionProfessions } from "./solutionPresentation";

export type SolutionVisual = "profile" | "commerce" | "routing" | "handoff" | "media" | "rotation" | "campaign" | "portfolio" | "qr";

export interface SolutionDetailDefinition {
  path: string;
  label: string;
  title: string;
  lead: string;
  icon: LucideIcon;
  visual: SolutionVisual;
  visualTitle: string;
  destinations: [string, string, string];
  useWhen: string;
  steps: [ContentBlock, ContentBlock, ContentBlock];
  capabilities: [ContentBlock, ContentBlock, ContentBlock];
  boundary: ContentBlock;
  featureLink: { path: string; label: string };
  faqs: [Faq, Faq, Faq];
  related: RelatedLink[];
  seo: PageSeoConfig;
}

interface ContentBlock { title: string; text: string }
interface Faq { question: string; answer: string }
interface RelatedLink { path: string; title: string; label: string }

interface ProfessionRecord {
  slug: string;
  name: string;
  headline: string;
  subheadline: string;
  links: { title: string; icon: string; clicks: string }[];
  seoTitle: string;
  seoDescription: string;
}

const related = (path: string, title: string, label: string): RelatedLink => ({ path, title, label });
const faq = (question: string, answer: string): Faq => ({ question, answer });
const block = (title: string, text: string): ContentBlock => ({ title, text });

const commonAnalytics = block("See the response", "Review clicks over time and available country, device, referrer, browser, and operating-system breakdowns. Use the pattern to decide what to change next.");
const managedDestination = block("Change the destination", "Keep the public URL stable while you update the destination or page behind it. The links already shared in posts and profiles can keep working.");

interface ProfessionNarrative {
  lead: string;
  useWhen: string;
  steps: [ContentBlock, ContentBlock, ContentBlock];
  capabilities: [ContentBlock, ContentBlock, ContentBlock];
  boundary: ContentBlock;
  featureLink: { path: string; label: string };
  faqs: [Faq, Faq, Faq];
}

const professionNarratives: Record<string, ProfessionNarrative> = {
  "real-estate-agents": {
    lead: "Turn one bio URL into a current shortlist of listings, viewing options, neighborhood resources, and a direct enquiry path.",
    useWhen: "Instagram, printed cards, and property videos all need to point buyers to what is available now, even after individual listings change.",
    steps: [
      block("Feature the active property", "Put the current listing or open house first, with a label that names the neighborhood or property type instead of a generic “Learn more.”"),
      block("Separate browse from enquire", "Keep the full listings page, buyer guide, and viewing scheduler as distinct choices so a ready buyer does not have to hunt for contact details."),
      block("Track each promotion", "Use a campaign link or UTM label for a yard sign, Reel, or email, then compare clicks before deciding which listing to feature next."),
    ],
    capabilities: [
      block("A listing-led profile", "Use a branded profile to group current properties, brokerage pages, buyer resources, and contact destinations in a mobile-first order."),
      block("A stable URL for changing inventory", "Replace a sold property's destination with a new listing or collection without reprinting the QR code or editing every social bio."),
      block("Traffic signals by campaign", "Review link clicks and available source, device, and country data. Your CRM or booking service remains the source for qualified enquiries and appointments."),
    ],
    boundary: block("Linktery is not an MLS or CRM", "Listing availability, lead forms, calendar slots, and client follow-up stay in your brokerage, MLS, form, or scheduling system. Linktery organizes and measures the route into them."),
    featureLink: { path: "/templates/link-in-bio", label: "Explore Public Profiles" },
    faqs: [
      faq("What should happen when a featured property sells?", "Replace or reorder that card, then send it to an active listing or your current inventory page. The public profile URL can stay the same."),
      faq("Does Linktery capture buyer details?", "No. Linktery records profile activity and link clicks. Connect a form, CRM, or scheduling page to collect and manage enquiries."),
      faq("Can I compare a sign, Instagram post, and email?", "Yes. Give each placement its own managed link or UTM-labelled destination, then compare click activity while using your CRM for downstream lead quality."),
    ],
  },
  "onlyfans-creators": {
    lead: "Create a clear public layer between social profiles and your current membership, community, store, and announcement destinations.",
    useWhen: "You need one recognizable creator URL that can change with a promotion while keeping labels transparent across the social platforms where it is shared.",
    steps: [
      block("Build the public identity", "Choose a neutral public name, avatar, and profile design that your audience recognizes before they leave the social platform."),
      block("Label every destination plainly", "Separate membership, community, shop, and contact paths. Put the current offer first without disguising where a visitor will go."),
      block("Retire old promotions quickly", "When an offer or page changes, update the attached destination and test it from the actual Instagram, TikTok, or X entry point."),
    ],
    capabilities: [
      block("Campaign-ready creator pages", "Change profile styling, card order, social icons, and attached links while keeping the public slug consistent."),
      block("One place for backup destinations", "Maintain current web destinations behind the profile instead of scattering temporary URLs across past posts and messages."),
      block("Click context without pretending it is revenue", "Review views, clicks, and available source or device signals. Membership platforms remain responsible for subscriptions and earnings."),
    ],
    boundary: block("No landing page overrides platform policy", "Linktery cannot guarantee acceptance, prevent moderation, or conceal a destination from a platform. Use accurate labels and follow the current external-link rules everywhere you share."),
    featureLink: { path: "/templates", label: "Choose a profile template" },
    faqs: [
      faq("Can I update a limited-time offer without changing my bio?", "Yes. Change the linked card or its destination while keeping the public profile URL already shared in your bio."),
      faq("Will this protect a social account from moderation?", "No. Moderation and link policies belong to each platform. Linktery provides a branded page, not a guarantee or policy bypass."),
      faq("Can Linktery show which membership produced a paid subscriber?", "Linktery measures views and clicks. Use the membership platform's own reporting for subscriptions, renewals, and revenue attribution."),
    ],
  },
  musicians: {
    lead: "Give a release one durable URL for streaming services, an external pre-save page, tour tickets, merch, and the next announcement.",
    useWhen: "A song or tour campaign reaches fans on different devices and listening services, and the lead destination changes between teaser, release day, and post-release promotion.",
    steps: [
      block("Name the release first", "Lead with the track, album, or show the campaign is about, then list Spotify, Apple Music, YouTube Music, or ticket destinations beneath it."),
      block("Plan the release-day switch", "Before release, link to your distributor's pre-save page. On release day, replace or reorder it with live listening destinations."),
      block("Test app and web paths", "Try every service from iOS, Android, and the social apps you use. Keep a normal HTTPS page available whenever a native handoff is refused."),
    ],
    capabilities: [
      block("A release hub that evolves", "Reuse a branded page across teaser, launch, tour, and catalog phases by changing the card hierarchy instead of the campaign URL."),
      block("Supported music-app handoffs", "Attempt compatible app opening for selected destinations while retaining a web fallback for browsers and devices that block the handoff."),
      block("Listening-intent signals", "Compare clicks to each service and available source or country breakdowns. Streaming platforms remain the source for plays, saves, follows, and royalties."),
    ],
    boundary: block("Pre-save and streaming actions happen elsewhere", "Linktery does not run a native pre-save flow or report completed streams. Connect a distributor or pre-save service, and treat Linktery clicks as the path into that experience."),
    featureLink: { path: "/features/deep-linking", label: "Explore deep linking" },
    faqs: [
      faq("Can I switch from pre-save to listen-now on release day?", "Yes. Update or reorder the destinations behind the same public campaign URL after checking that every service link is live."),
      faq("Will Spotify always open in its app?", "No. Opening depends on the installed app, operating system, and source browser. Keep the Spotify web URL working as the fallback."),
      faq("Does Linktery count actual streams or ticket sales?", "No. It records link activity. Use the streaming service, distributor, or ticket platform for plays, purchases, saves, and revenue."),
    ],
  },
  "fitness-coaches": {
    lead: "Organize coaching applications, program information, workout resources, booking, and partner recommendations without turning one bio into a wall of links.",
    useWhen: "Prospective clients arrive with different intent: some want to understand the program, some are ready to apply, and existing clients need a resource or check-in path.",
    steps: [
      block("Choose one primary coaching action", "Lead with an application, consultation, or flagship program rather than giving every download and partner link equal weight."),
      block("Answer before the form", "Add a concise program overview, expected commitment, or FAQ destination so the application receives better-informed visitors."),
      block("Separate client resources", "Keep check-ins, member portals, or workout downloads clearly labelled so existing clients do not compete with new-lead CTAs."),
    ],
    capabilities: [
      block("A structured coaching front door", "Group program, application, booking, resource, and recommendation links under a profile design that matches your coaching brand."),
      block("Campaign changes without bio edits", "Move a challenge, cohort, or seasonal program to the first position and later replace it while the profile URL stays familiar."),
      block("Interest before intake", "See which paths receive clicks and which sources send visits. Your form, calendar, CRM, or checkout measures applications, bookings, and payments."),
    ],
    boundary: block("Coaching operations stay in specialist systems", "Linktery does not provide intake forms, medical screening, appointment calendars, workout delivery, or payment processing. Link to the compliant tools you use for each job."),
    featureLink: { path: "/templates", label: "Choose a coaching profile" },
    faqs: [
      faq("Can I send visitors directly to a coaching application?", "Yes. Add the application or consultation page as a prominent card and keep the form itself in your preferred form or coaching system."),
      faq("Can I separate prospects from current clients?", "Yes. Use clear card groups and labels, or create separate profiles when the audiences and resources should not share the same page."),
      faq("Does a click mean someone became a client?", "No. Linktery records interest at the link level. Confirm completed applications, booked calls, and payments in the connected service."),
    ],
  },
  "ugc-creators": {
    lead: "Send brands a portfolio that foregrounds relevant examples, collaboration details, and one obvious enquiry route instead of an outdated attachment.",
    useWhen: "A brand manager opens your pitch on a phone and needs to judge your style, category experience, and availability in under a minute.",
    steps: [
      block("Curate for the pitch", "Feature a small set of category-relevant videos or case studies instead of asking the buyer to browse every piece of content you have made."),
      block("State the working context", "Link to service formats, usage-rights information, or a current media kit where it helps the brand qualify the collaboration."),
      block("Give the response one destination", "Keep email, a project enquiry form, or a scheduling page visible and compare source-labelled portfolio clicks across outreach channels."),
    ],
    capabilities: [
      block("A portfolio built for mobile review", "Arrange hosted examples, service pages, testimonials, and contact links inside a branded Public Profile."),
      block("Fresh work behind an old pitch", "Replace a sample or reorder the portfolio after sending it without invalidating the URL in earlier outreach."),
      block("Outreach-level click context", "Compare portfolio views and clicks from email, Instagram, or a media kit. Proposal status and signed work remain in your sales workflow."),
    ],
    boundary: block("Linktery organizes the portfolio path", "Host high-resolution video, contracts, briefs, usage rights, and invoicing in the tools built for them. Linktery does not accept proposals or store production files."),
    featureLink: { path: "/templates", label: "Explore portfolio templates" },
    faqs: [
      faq("Should every past UGC project appear on the page?", "Usually not. Lead with a focused set that matches the category or format in the pitch, then link to a broader archive only if it helps."),
      faq("Can I replace a sample after sending the portfolio?", "Yes. Update the profile cards while keeping the portfolio URL the brand already received."),
      faq("Can Linktery tell me whether a brand approved the proposal?", "No. It measures profile views and link clicks. Track replies, stages, contracts, and revenue in your email or CRM workflow."),
    ],
  },
  streamers: {
    lead: "Bring the current live channel, schedule, latest video, Discord community, and sponsor or merch destination into one recognizable creator page.",
    useWhen: "Your audience follows you across Twitch, YouTube, TikTok, Discord, and a store, while the most important destination changes around streams and launches.",
    steps: [
      block("Lead with what is happening now", "Put the live channel or upcoming event first during a broadcast window, then return the latest video or schedule to the lead position afterward."),
      block("Separate watch, join, and shop", "Use distinct labels for stream platforms, Discord, merch, and sponsor destinations so fans know what will happen before tapping."),
      block("Test from the community channels", "Open the page from Discord, TikTok, and mobile browsers. Verify both app attempts and web fallbacks before a live event starts."),
    ],
    capabilities: [
      block("A live-campaign profile", "Reorder stream, VOD, schedule, community, and merch links around the content calendar without changing the bio URL."),
      block("Supported channel handoffs", "Attempt compatible app opening for selected platforms while keeping a normal web destination for blocked or desktop visits."),
      block("Channel-interest reporting", "Compare clicks to stream, community, and store destinations. Twitch, YouTube, Discord, and the store report follows, joins, watch time, and purchases."),
    ],
    boundary: block("No automatic live-status sync", "Linktery does not detect when a stream starts or automatically change the profile. Update the order yourself or link to a service that maintains live status."),
    featureLink: { path: "/features/deep-linking", label: "Explore app-aware links" },
    faqs: [
      faq("Can the live channel move to the top before a stream?", "Yes. Reorder the cards before going live, then restore your evergreen content after the event."),
      faq("Will Twitch or Discord always open in the app?", "No. The source browser, device, and installed apps determine the result, so every destination needs a usable HTTPS fallback."),
      faq("Can Linktery report Discord joins or watch time?", "No. It records clicks into those platforms. Use their own analytics for joins, follows, subscriptions, and viewing behavior."),
    ],
  },
  photographers: {
    lead: "Present selected galleries, current packages, availability or enquiry, and client resources through one polished mobile profile.",
    useWhen: "A prospective client discovers your work on social media and needs a fast route from visual proof to the right wedding, portrait, commercial, or licensing enquiry.",
    steps: [
      block("Open with the right body of work", "Feature a focused gallery for the audience you are targeting instead of sending every visitor to a mixed portfolio homepage."),
      block("Clarify the service path", "Add package information, location or travel notes, and a dedicated enquiry form so an interested visitor knows the next step."),
      block("Keep client delivery separate", "Label proofing or gallery-login links as client resources and avoid mixing private delivery paths with public portfolio cards."),
    ],
    capabilities: [
      block("A curated portfolio index", "Use image-led cards to connect mobile visitors to externally hosted galleries, service pages, publications, and enquiries."),
      block("Seasonal work without a new URL", "Change the featured gallery from weddings to holiday portraits or a commercial case study while retaining the profile address."),
      block("Interest by collection", "Review which gallery and enquiry links receive clicks. Your gallery host, form, or CRM records downloads, leads, bookings, and contracts."),
    ],
    boundary: block("Not a client gallery or DAM", "Linktery does not host full-resolution shoots, proofs, selection workflows, licensing files, or private delivery. Keep those assets in your gallery or storage platform."),
    featureLink: { path: "/templates", label: "Explore visual templates" },
    faqs: [
      faq("Can I show different photography specialties?", "Yes. Use separate cards for selected galleries, or separate Public Profiles when wedding, portrait, and commercial audiences need different positioning."),
      faq("Does Linktery host full-resolution galleries?", "No. Link to Pixieset, Pic-Time, your website, or another gallery host and use Linktery as the mobile index."),
      faq("Can I measure completed photography enquiries?", "Linktery measures the click into your enquiry path. The connected form or CRM remains the source for submissions and booked work."),
    ],
  },
  podcasters: {
    lead: "Give each launch, season, or evergreen show page a single route to the latest episode, listening apps, newsletter, guest resources, and sponsor links.",
    useWhen: "Listeners arrive from clips, guest posts, newsletters, and QR codes but prefer different podcast apps and do not all need the same next step.",
    steps: [
      block("Choose episode or show intent", "For a launch, lead with the specific episode. For an evergreen bio, lead with the show page and keep the latest episode directly beneath it."),
      block("Offer the relevant listening choices", "List Apple Podcasts, Spotify, YouTube, and the RSS or web player only when they are active and clearly named."),
      block("Tag clips and guest campaigns", "Use source-specific managed links for a guest newsletter, YouTube clip, or conference QR code, then compare clicks into each destination."),
    ],
    capabilities: [
      block("An episode-aware listening hub", "Combine platform choices with show notes, guest resources, newsletter, and current sponsor destinations in one updateable profile."),
      block("Supported podcast-app opening", "Attempt compatible app handoffs while retaining a web player or HTTPS show page for browsers that do not pass the visitor to an app."),
      block("Promotion-path analytics", "See which placements and listening destinations receive clicks. Podcast hosts remain the source for downloads, retention, subscribers, and ad delivery."),
    ],
    boundary: block("Linktery does not host or measure the podcast feed", "RSS publishing, episode playback, follows, completed listens, and listener retention stay with your podcast host and listening platforms."),
    featureLink: { path: "/features/deep-linking", label: "Explore deep linking" },
    faqs: [
      faq("Can one link serve Apple Podcasts and Spotify listeners?", "Yes. Put both destinations on the profile, or use a managed page that lets the listener choose the active service."),
      faq("Will a podcast app always open automatically?", "No. App handoffs depend on the device and browser. Keep a working web player or show page as the fallback."),
      faq("Does Linktery count episode downloads?", "No. It measures clicks toward the episode or platform. Use your podcast host for downloads, completion, and subscriber reporting."),
    ],
  },
  authors: {
    lead: "Connect a current book, retailer choices, reviews, events, newsletter, and reader extras without making each launch start from a new bio URL.",
    useWhen: "A reader discovers you through an excerpt, event, interview, or social post and needs a direct path to the right title and retailer in their region.",
    steps: [
      block("Lead with the current title", "Name the book and edition in the first card, then separate retailer, audiobook, library, or signed-copy destinations underneath."),
      block("Give non-buyers another way in", "Add a sample chapter, event calendar, newsletter, or reading-order page for readers who are not ready to purchase."),
      block("Refresh between launch phases", "Move pre-order, release-day, event, and review destinations as the campaign changes while the author profile URL remains stable."),
    ],
    capabilities: [
      block("A catalog-aware author page", "Present current and backlist titles, retailer options, newsletter, appearances, and reader resources in a deliberate order."),
      block("Managed links for print and interviews", "Point a QR code or podcast-show-note link to a managed URL, then update the featured book without changing the printed or published source."),
      block("Reader-interest signals", "Compare clicks to retailers, samples, events, and newsletter pages. Retailers and email platforms report purchases and subscriptions."),
    ],
    boundary: block("No royalty or retailer-order reporting", "Linktery records the route to a book or newsletter. Amazon, bookstores, ticket providers, and email platforms remain authoritative for sales, reviews, attendance, and signups."),
    featureLink: { path: "/features/url-shortener", label: "Explore managed links" },
    faqs: [
      faq("Can I feature a pre-order and change it on release day?", "Yes. Reorder or replace that card while keeping the author profile and any managed campaign links unchanged."),
      faq("Can readers choose between retailers?", "Yes. Add clearly labelled retailer or format options, and consider separate regional destinations when your campaign requires them."),
      faq("Does Linktery report book sales or newsletter subscribers?", "No. It reports profile and click activity. Use retailer and newsletter analytics for completed purchases and signups."),
    ],
  },
  artists: {
    lead: "Create a compact route from your current body of work to commission details, print or digital stores, memberships, exhibitions, and contact.",
    useWhen: "A curator, art director, collector, or fan arrives from a visual social post and should not have to search a large site for the relevant portfolio or buying path.",
    steps: [
      block("Curate the first impression", "Link the collection or case study that matches the audience, then keep the broader archive as a secondary route."),
      block("State commission status clearly", "Use labels such as “Commission waitlist,” “Rates,” or “Commissions closed” and link to the external form that contains the current terms."),
      block("Separate viewing from buying", "Keep portfolio, print store, digital products, membership, and exhibition information distinct so each visitor can choose the right path."),
    ],
    capabilities: [
      block("An art-led profile index", "Use visual cards and profile customization to connect collections, process work, shops, memberships, and contact under one identity."),
      block("Current availability behind one address", "Change a commission waitlist, exhibition, or featured collection without replacing the URL in past posts and printed material."),
      block("Demand signals by destination", "Review clicks toward portfolio, commission, and store pages. The external shop or form reports orders, files, and accepted commissions."),
    ],
    boundary: block("Commerce and delivery remain external", "Linktery does not manage commission slots, license artwork, deliver files, or process shop orders. Connect the services that handle those obligations."),
    featureLink: { path: "/templates", label: "Explore visual templates" },
    faqs: [
      faq("Can I show commissions as closed without changing my bio?", "Yes. Change the card label and destination, hide the old path, or send visitors to a waitlist while keeping the profile URL."),
      faq("Can Linktery deliver purchased digital art?", "No. Link to your store or delivery platform for checkout, licensing, taxes, and file access."),
      faq("Can I compare portfolio clicks with store clicks?", "Yes. Linktery reports link activity for each path, while the store remains the source for purchases and revenue."),
    ],
  },
  "beauty-influencers": {
    lead: "Organize current looks, product lists, tutorials, sponsor campaigns, discount codes, and evergreen recommendations in a page that can change with your content calendar.",
    useWhen: "Followers ask for the exact products from a post, while sponsored links and promo codes expire faster than an Instagram bio or saved video.",
    steps: [
      block("Match the post to the first card", "Name the look, routine, or product list so visitors arriving from a Reel recognize it immediately."),
      block("Separate sponsored and evergreen paths", "Keep the current partnership prominent, preserve an evergreen routine beneath it, and include required affiliate or sponsorship disclosures."),
      block("Retire expired codes", "Update or remove promotion cards when the terms change, then test the retailer destination and code before sending new traffic."),
    ],
    capabilities: [
      block("A shoppable content index", "Group looks, tutorials, product collections, LTK or retailer pages, sponsor offers, and social channels under a branded profile."),
      block("Fast campaign merchandising", "Reorder the page around a launch or seasonal routine while old posts continue pointing to the same profile."),
      block("Product-interest reporting", "See which product lists and retailer links receive clicks. Affiliate networks and shops report attributed orders, returns, and commission."),
    ],
    boundary: block("Clicks do not prove an affiliate sale", "Linktery does not read retailer carts or commission events. Keep disclosures visible and use the affiliate platform's reporting for revenue and attribution."),
    featureLink: { path: "/templates", label: "Choose a creator template" },
    faqs: [
      faq("Can I make the latest routine the first item?", "Yes. Reorder profile cards as your content calendar changes without replacing the profile URL."),
      faq("What should I do when a discount code expires?", "Remove or relabel the card promptly, update its destination if needed, and test the replacement before promoting it."),
      faq("Does Linktery know which product was purchased?", "No. It records clicks to the destination. Use the retailer or affiliate network for orders, attribution, and commission data."),
    ],
  },
  "e-commerce-brands": {
    lead: "Build a mobile campaign doorway for featured products, collections, regional stores, support, and the current offer while the storefront remains the place where shopping happens.",
    useWhen: "Traffic arrives from creator posts, paid social, email, packaging, and QR codes, but different campaigns and regions should not all land on the store homepage.",
    steps: [
      block("Choose the campaign landing path", "Send a product launch to the exact product or collection page and keep the general storefront as a fallback rather than the primary CTA."),
      block("Preserve campaign context", "Add validated UTM parameters, use source-specific managed links, and configure country or device rules only where they lead to a genuinely different destination."),
      block("Audit the complete checkout route", "Test the social webview, external browser fallback, storefront, and payment step on real devices before increasing campaign spend."),
    ],
    capabilities: [
      block("Campaign destinations outside the homepage", "Create managed routes for product drops, collections, bundles, waitlists, or support information without rebuilding the store."),
      block("Country and device routing", "Send matching visitors to configured regional or device-specific pages and retain a dependable default destination for everyone else."),
      block("Click analytics before the storefront", "Compare source, country, device, and link activity in Linktery, then use storefront analytics for carts, checkout, purchases, refunds, and revenue."),
    ],
    boundary: block("Linktery is not storefront analytics", "It cannot guarantee an external-browser handoff, preserve a payment session, or see completed checkout events by itself. The commerce platform remains authoritative after the click."),
    featureLink: { path: "/features/geo-targeting", label: "Explore geo targeting" },
    faqs: [
      faq("Can a campaign link point to a new collection later?", "Yes. Update the managed destination while keeping the URL already used in ads, creator briefs, or printed QR codes."),
      faq("Will every social click leave the in-app browser?", "No. Browser handoffs are controlled by the operating system and source app. Keep the storefront usable inside the webview and test a reliable fallback."),
      faq("Does Linktery report purchases and checkout conversion?", "No. It reports link activity. Use Shopify or your commerce analytics for carts, orders, revenue, refunds, and customer behavior."),
    ],
  },
  "ai-models": {
    lead: "Give a virtual creator a consistent public identity for current content, social channels, companion experiences, memberships, and community destinations.",
    useWhen: "A virtual persona appears across several platforms and campaigns, but its public-facing links need clear ownership, consistent labels, and fast destination updates.",
    steps: [
      block("Define the public persona", "Use the same recognizable name, avatar, and description across the Linktery profile and the social accounts that send visitors to it."),
      block("Explain every experience", "Distinguish public content, chat or companion tools, membership pages, and community links so a visitor understands whether a destination is external or paid."),
      block("Maintain campaign routes", "Replace an inactive campaign or platform destination centrally, then test every advertised and social entry point after the change."),
    ],
    capabilities: [
      block("A separate identity per virtual creator", "Give each persona its own profile design, slug, social links, and attached cards rather than mixing a roster into one ambiguous page."),
      block("Managed destinations for changing campaigns", "Keep a stable public profile while updating current content, external experiences, or membership pages behind it."),
      block("Traffic context across identities", "Review profile and link activity by persona and campaign. External services remain responsible for conversations, memberships, and revenue."),
    ],
    boundary: block("Identity clarity matters", "Linktery does not conceal destinations, imitate human verification, or bypass moderation. Disclose synthetic or virtual identity where required and follow each platform's current policies."),
    featureLink: { path: "/templates/link-in-bio", label: "Explore Public Profiles" },
    faqs: [
      faq("Can each virtual creator have a separate profile?", "Yes. Each Public Profile can have its own name, avatar, slug, design, social links, and attached managed links."),
      faq("Can I replace an inactive membership or chat destination?", "Yes. Update the destination centrally, keep the public profile URL, and test the new route before resuming promotion."),
      faq("Does Linktery hide where a link leads?", "No. Use accurate labels and transparent destinations. Linktery manages the route; it is not a moderation-evasion or identity-concealment service."),
    ],
  },
  "ai-agencies": {
    lead: "Organize a virtual-creator roster into distinct public identities, campaign links, regional destinations, and reporting paths that a team can maintain centrally.",
    useWhen: "Several operators manage multiple personas and promotions, and a destination change should not require editing every model bio, campaign brief, and partner placement.",
    steps: [
      block("Separate the roster into identities", "Give each virtual creator a dedicated profile and naming system instead of sending every audience to one agency landing page."),
      block("Document the active campaign routes", "Use clear link names, source labels, and default destinations so team members know which URL belongs in each brief or account."),
      block("Review and retire centrally", "Audit campaigns on a schedule, replace inactive destinations, and compare click patterns before changing where new traffic is sent."),
    ],
    capabilities: [
      block("Profile architecture for a roster", "Maintain multiple public identities with their own cards and social destinations under a consistent operational structure."),
      block("Routing for regional promotions", "Configure country or device destinations where campaigns genuinely differ and preserve a default path for unmatched visitors."),
      block("Shared traffic reporting", "Use link analytics to review sources and audience signals across campaigns. Subscription and commerce platforms remain the source for conversions and revenue."),
    ],
    boundary: block("No automated campaign or platform inventory", "Linktery does not discover disabled accounts, guarantee failover, or synchronize membership-platform status. Your team must validate destinations and update routing when campaign state changes."),
    featureLink: { path: "/features/geo-targeting", label: "Explore geo targeting" },
    faqs: [
      faq("Should every model share one agency profile?", "Usually no. Separate profiles keep identity, audience expectations, and analytics clearer; use an agency page only when a roster overview is the visitor's actual goal."),
      faq("Can a team swap a campaign destination without changing the promo URL?", "Yes. Update the managed destination and retest it while the placed campaign URL stays the same."),
      faq("Does Linktery automatically detect a disabled destination?", "No. Teams should monitor campaign platforms and audit active links. Linktery does not promise automatic health checks or failover."),
    ],
  },
  vtubers: {
    lead: "Bring live channels, schedule, clips, Discord, merch, fan art rules, and current collaborations together under a profile that matches the virtual identity.",
    useWhen: "Fans move between Twitch, YouTube, X, Discord, and a merch store, while debut, anniversary, convention, and sponsor campaigns each change the leading action.",
    steps: [
      block("Set the event priority", "Move the debut, anniversary stream, convention appearance, or current live channel to the first card during its campaign window."),
      block("Organize the fan journey", "Keep watch, join, shop, schedule, and fan-content guidelines as separate paths with labels that match the VTuber's established vocabulary."),
      block("Test app and desktop behavior", "Open Twitch, YouTube, and Discord routes from mobile social apps and desktop. Keep web destinations useful if the native app does not accept the handoff."),
    ],
    capabilities: [
      block("A profile that matches the character", "Use profile design, avatar, social icons, and visual cards to keep the virtual identity consistent across every external destination."),
      block("Event-led card ordering", "Change the first action around debuts, streams, merch drops, and convention dates without asking fans to learn a new URL."),
      block("Fan-path analytics", "Compare clicks to live channels, Discord, clips, and stores. The destination platforms report watch time, joins, memberships, and purchases."),
    ],
    boundary: block("No automatic stream or community state", "Linktery does not know when you go live, whether a Discord invite is valid, or whether merch is in stock. Update and test those destinations as part of the event checklist."),
    featureLink: { path: "/features/deep-linking", label: "Explore app-aware links" },
    faqs: [
      faq("Can I put an anniversary stream first for one week?", "Yes. Reorder the cards for the event and restore the evergreen channel or schedule afterward without changing the profile URL."),
      faq("Will Discord and Twitch always open in their apps?", "No. App handoffs depend on the visitor's device and browser. Keep official HTTPS destinations available as fallbacks."),
      faq("Can Linktery show Discord joins or merch orders?", "No. It measures clicks into those destinations. Use Discord, the streaming platform, and your store for completed actions."),
    ],
  },
};

const explicitSolutions: SolutionDetailDefinition[] = [
  {
    path: "/solutions/onlyfans-link-in-bio", label: "Creator memberships", title: "A clearer home for every creator link.",
    lead: "Bring social profiles, membership destinations, and current offers together on one branded page. Change what you promote without replacing the URL in every bio.",
    icon: UsersRound, visual: "profile", visualTitle: "Creator profile", destinations: ["Latest offer", "Membership page", "Community"],
    useWhen: "You share across several social profiles and need one public page whose order, design, and destinations can change with your campaign.",
    steps: [block("Set the public identity", "Choose a profile name, public slug, avatar, and template that match the identity your audience already recognizes."), block("Order the important paths", "Put the current campaign first, then add membership, community, or store destinations as supporting cards."), block("Share a stable profile URL", "Use the same profile link across channels, then review profile views and card clicks before changing the order.")],
    capabilities: [block("Deep profile customization", "Adjust the template, colors, profile details, social links, and linked cards without changing the public address."), managedDestination, commonAnalytics],
    boundary: block("Keep the promise clear", "A landing page cannot override a social network's content or external-link policies. Use transparent labels and destinations that comply with every platform where you share."),
    featureLink: { path: "/templates", label: "Explore profile templates" },
    faqs: [faq("Can I keep my creator identity separate from my Linktery account?", "Yes. A Public Profile has its own public name, avatar, slug, social links, and attached smart links."), faq("Can I change an offer after publishing the profile URL?", "Yes. Update or reorder the cards on the profile while keeping its public URL the same."), faq("Does Linktery guarantee that a social platform will accept my link?", "No. Platform policies and moderation decisions remain under each platform's control. Keep labels and destinations clear and compliant.")],
    related: [related("/solutions/bio-link-tool", "Give every link one home", "Social bio"), related("/solutions/fanvue-ai-models", "Organize virtual creator traffic", "Virtual creators"), related("/templates", "Choose a profile structure", "Templates")], seo: SEO_PAGES.onlyfansSolution,
  },
  {
    path: "/solutions/telegram-bio-link", label: "Telegram", title: "Turn a social click into a clear path to Telegram.",
    lead: "Share a managed Telegram link that can attempt a supported app handoff and still keep a normal HTTPS destination when the app or browser blocks it.",
    icon: MessageCircle, visual: "handoff", visualTitle: "Telegram handoff", destinations: ["Social app", "Telegram app", "Web fallback"],
    useWhen: "Your channel or community is promoted inside social apps, where embedded browsers can behave differently from Safari or Chrome.",
    steps: [block("Start with a valid web URL", "Use the official HTTPS address for the channel, group, bot, or invite as the dependable fallback."), block("Configure the handoff", "Attach the Telegram destination to a managed link and enable the supported app-opening behavior for compatible devices."), block("Test the real entry points", "Open the link inside every social app you use, on both iOS and Android, and keep the web route usable.")],
    capabilities: [block("Supported app handoff", "Attempt to continue in Telegram when the visitor's device and browser allow it."), managedDestination, commonAnalytics],
    boundary: block("A fallback is part of the solution", "No link can force every operating system or embedded browser to open another app. The visitor may stay on the web, so the HTTPS destination must remain useful."),
    featureLink: { path: "/features/deep-linking", label: "Explore deep linking" },
    faqs: [faq("Will every click open the Telegram app?", "No. App handoffs depend on the device, installed apps, operating system, and the browser that handles the click."), faq("What happens when the app cannot open?", "The visitor continues to the HTTPS Telegram destination you configured as the fallback."), faq("Can I see where the Telegram clicks came from?", "Linktery records link clicks and available referrer and device breakdowns. UTM parameters can add campaign context to the destination URL.")],
    related: [related("/solutions/deeplink-generator", "Build an app-aware link", "App handoffs"), related("/solutions/smart-link-redirect", "Route by country or device", "Smart routing"), related("/guides/deep-links-and-in-app-browsers", "Understand in-app browsers", "Guide")], seo: SEO_PAGES.telegramSolution,
  },
  {
    path: "/solutions/affiliate-smart-link-rotator", label: "Affiliate campaigns", title: "Compare affiliate destinations without losing the campaign link.",
    lead: "Distribute visits evenly across configured offers, compare click activity, and replace a destination while the managed campaign URL stays the same.",
    icon: Split, visual: "rotation", visualTitle: "Campaign rotation", destinations: ["Offer A", "Offer B", "Click report"],
    useWhen: "You have two or more eligible destinations and want an even traffic split before choosing the offer you will promote next.",
    steps: [block("Validate every offer", "Add only active, policy-compliant destination URLs and confirm that tracking parameters and disclosures are correct."), block("Split visits evenly", "Use the Link Rotator to distribute incoming clicks across the active destinations with equal probability."), block("Compare the full result", "Use Linktery for click activity and your affiliate network for conversions, revenue, approvals, and downstream quality.")],
    capabilities: [block("Even link rotation", "Rotate across the active variants without changing the campaign URL already placed in ads, messages, or posts."), managedDestination, commonAnalytics],
    boundary: block("Clicks are not conversions", "Linktery does not see the purchase or lead status inside an affiliate network. Do not choose a winner from click counts alone, and note that custom split weights are not available."),
    featureLink: { path: "/features/link-rotator", label: "Explore Link Rotator" },
    faqs: [faq("Can I set a 70/30 traffic split?", "No. The current Link Rotator distributes clicks evenly across active destinations."), faq("Does Linktery track affiliate sales?", "No. Linktery measures click activity. Use the affiliate network or destination analytics for sales, leads, and commissions."), faq("Can I replace an expired offer?", "Yes. Update the destination behind the managed campaign link, then test the route before sending more traffic.")],
    related: [related("/solutions/smart-link-redirect", "Route a campaign by signal", "Smart routing"), related("/solutions/amazon-smart-links", "Share Amazon recommendations", "Amazon"), related("/guides/how-to-track-link-clicks", "Plan campaign measurement", "Guide")], seo: SEO_PAGES.affiliateSolution,
  },
  {
    path: "/solutions/bio-link-tool", label: "Social bio", title: "Give your content a home.",
    lead: "Build one mobile-friendly page for your latest work, current offer, social channels, and contact path. Reorder the page as your priorities change.",
    icon: Link2, visual: "profile", visualTitle: "Public profile", destinations: ["Featured link", "Latest work", "Contact"],
    useWhen: "A single social bio field needs to introduce several parts of your work without sending visitors through a full website navigation.",
    steps: [block("Choose one primary action", "Decide what a new visitor should do first. The top card should answer that question without making them scan the whole page."), block("Build the supporting path", "Add only the links that help the visitor continue: your latest content, an offer, another channel, or a contact option."), block("Publish and refine", "Check the profile on a real phone, share its URL, and use profile views and card clicks to improve the hierarchy.")],
    capabilities: [block("Flexible profile design", "Choose a template and adjust identity, colors, social links, and cards to fit the way you publish."), managedDestination, commonAnalytics],
    boundary: block("A focused page works harder", "The profile can hold many links, but that does not mean every link belongs there. Keep the most important choice visible and remove stale destinations."),
    featureLink: { path: "/templates", label: "Explore profile templates" },
    faqs: [faq("Can I create more than one Public Profile?", "Plan limits determine how many profiles you can create. Each profile keeps its own identity, slug, links, and analytics."), faq("Can I change the template later?", "Yes. You can change the profile presentation without replacing the profile's public URL."), faq("What does profile analytics include?", "Linktery records profile views and attached-link clicks, with available time, country, device, referrer, browser, and operating-system breakdowns.")],
    related: [related("/templates", "Choose your profile layout", "Templates"), related("/solutions/ugc-portfolio", "Build a portfolio for brands", "UGC portfolio"), related("/guides/how-to-create-a-link-in-bio", "Plan a focused profile", "Guide")], seo: SEO_PAGES.bioLinkTool,
  },
  {
    path: "/solutions/smart-link-redirect", label: "Campaign routing", title: "One campaign link. The right destination.",
    lead: "Set a dependable default URL, then route eligible visitors to another page by country or device. Keep every rule readable from one workspace.",
    icon: Route, visual: "routing", visualTitle: "Routing rules", destinations: ["Default page", "Country rule", "Device rule"],
    useWhen: "A campaign serves more than one region or device experience and you need a single public URL with an explicit fallback.",
    steps: [block("Set the default first", "Choose the page every visitor can use. It catches traffic when no rule matches or a signal is unavailable."), block("Add narrow rules", "Start with country routing, then add a device rule only when the destination is genuinely different for that visitor."), block("Test the complete route", "Verify the default and every configured outcome before publishing, then watch click breakdowns for unexpected traffic.")],
    capabilities: [block("Country-based routing", "Send configured countries to their own store, language, resource, or campaign page."), block("Device-based routing", "Choose a different destination for mobile and desktop traffic when the experience requires it."), commonAnalytics],
    boundary: block("Signals need a safe default", "Location and device signals can be incomplete or obscured. Routing should improve a visitor's path, never make the destination unusable when a rule cannot be evaluated."),
    featureLink: { path: "/features/geo-targeting", label: "Explore geo targeting" },
    faqs: [faq("Which rule should I configure first?", "Start with a default destination, then add country rules and device rules only for the cases that need a different page."), faq("How precise is country routing?", "It uses the location signal available for the request. VPNs, relays, and network providers can affect the inferred country."), faq("What happens when no rule matches?", "The visitor is sent to the default destination configured for the managed link.")],
    related: [related("/solutions/geo-targeted-redirect", "Localize a campaign", "Regional campaigns"), related("/solutions/deeplink-generator", "Plan an app handoff", "Deep linking"), related("/features/device-targeting", "Route by device", "Feature")], seo: SEO_PAGES.smartRedirect,
  },
  {
    path: "/solutions/deeplink-generator", label: "App-aware sharing", title: "Help mobile visitors continue in the right app.",
    lead: "Create a managed link that attempts a supported native-app or external-browser handoff and keeps a reliable HTTPS fallback when automatic opening is blocked.",
    icon: Smartphone, visual: "handoff", visualTitle: "App handoff", destinations: ["Social webview", "Supported app", "HTTPS fallback"],
    useWhen: "Your audience taps links inside social apps and the destination has a supported native scheme or a better experience in the system browser.",
    steps: [block("Keep a complete HTTPS destination", "Start with a web page that works without the native app. It remains the safe outcome for unsupported devices and blocked handoffs."), block("Configure the supported path", "Add the destination and choose the available deep-link behavior. Do not invent schemes that the destination app does not document."), block("Test a small matrix", "Check iOS and Android, with and without the app installed, from each social app where the link will appear.")],
    capabilities: [block("App-opening attempt", "Use supported URI or browser handoffs when the device and source app allow them."), managedDestination, commonAnalytics],
    boundary: block("The operating system has the final say", "A website cannot force another app to open. Installed-app state, universal-link ownership, browser rules, and user settings all affect the result."),
    featureLink: { path: "/features/deep-linking", label: "Explore deep linking" },
    faqs: [faq("Can a deeplink force any app to open?", "No. The app must support the link type, and the operating system or embedded browser must allow the handoff."), faq("Do visitors without the app get stuck?", "They should not. Configure a normal HTTPS fallback that remains useful when the native app is unavailable."), faq("Where should I test the link?", "Test the exact places where you publish: common social webviews, Safari, Chrome, iOS, and Android, both with and without the destination app installed.")],
    related: [related("/guides/deep-links-and-in-app-browsers", "Understand in-app browsers", "Guide"), related("/solutions/telegram-bio-link", "Create a Telegram handoff", "Telegram"), related("/solutions/music-smart-links", "Share music destinations", "Music")], seo: SEO_PAGES.deeplinkGenerator,
  },
  {
    path: "/solutions/youtube-smart-links", label: "YouTube", title: "Keep every YouTube link useful after publish.",
    lead: "Place a managed URL in video descriptions, pinned comments, and channel pages. Update its destination later and keep campaign-level click context.",
    icon: Video, visual: "campaign", visualTitle: "Description link", destinations: ["Video description", "Managed URL", "Current offer"],
    useWhen: "Evergreen videos keep receiving views after the original campaign, product page, download, or sponsorship destination has changed.",
    steps: [block("Create a link for the job", "Use a clear slug and destination for the resource, sponsor, offer, or channel action mentioned in the video."), block("Add campaign context", "Use consistent UTM parameters when the destination analytics needs to separate clicks by video or placement."), block("Update, do not replace", "Change the destination in Linktery when the campaign ends, then test the old description link to confirm the new path.")],
    capabilities: [block("Stable managed URLs", "Keep a clean address in descriptions while the destination changes behind it."), block("UTM-ready destinations", "Carry source and campaign labels into the destination analytics with a consistent naming convention."), commonAnalytics],
    boundary: block("Keep the label accurate", "If the destination changes substantially, update the surrounding video copy or pinned comment when possible. A stable URL should not turn an old promise into a misleading one."),
    featureLink: { path: "/features/branded-links", label: "Explore branded links" },
    faqs: [faq("Can I change a YouTube description link after publishing?", "You can edit a YouTube description, but a managed Linktery URL also lets you update its destination without editing every placement."), faq("Can each video have its own reporting context?", "Yes. Create distinct managed links or use consistent UTM campaign labels for each video and placement."), faq("Does Linktery measure video views?", "No. Linktery measures activity on the links. Use YouTube Analytics for video impressions, views, and audience retention.")],
    related: [related("/guides/utm-parameters-guide", "Name campaign traffic clearly", "UTM guide"), related("/solutions/digital-product-smart-links", "Link a video to a product", "Digital products"), related("/features/link-analytics", "Read link analytics", "Feature")], seo: SEO_PAGES.youtubeSmartLinks,
  },
  {
    path: "/solutions/music-smart-links", label: "Music", title: "Give every release one link.",
    lead: "Bring Spotify, Apple Music, YouTube Music, tickets, and an external pre-save destination together. Let each fan choose the service they already use.",
    icon: Music2, visual: "media", visualTitle: "Release destinations", destinations: ["Spotify", "Apple Music", "YouTube Music"],
    useWhen: "A release or tour announcement needs one shareable address, but listeners and ticket buyers continue on different platforms.",
    steps: [block("Choose the release destination set", "Add the canonical web URLs for the services, video, ticket page, and any external pre-save provider you use."), block("Put the timely action first", "Lead with the new release, pre-save, or ticket date. Move older links down instead of making every option compete equally."), block("Share one release URL", "Use the managed page across social posts and messages, then compare service-card clicks and source traffic.")],
    capabilities: [block("Multi-service profile", "Present listening and ticket destinations on one branded, mobile-friendly page."), block("Supported app handoffs", "Attempt compatible music-app transitions while retaining the service's normal HTTPS page."), commonAnalytics],
    boundary: block("Linktery organizes the journey", "Linktery does not host music or provide a built-in streaming pre-save authorization flow. Link to the streaming, ticketing, or pre-save provider you already use."),
    featureLink: { path: "/templates", label: "Explore profile templates" },
    faqs: [faq("Can fans choose their own music service?", "Yes. Add each service as a separate destination on a Public Profile or campaign page."), faq("Does Linktery include a Spotify pre-save integration?", "No built-in pre-save authorization is promised. You can link to an external pre-save page as one of the release destinations."), faq("Will the Spotify or Apple Music app always open?", "No. Linktery can attempt supported handoffs, but the device and browser decide whether the native app opens.")],
    related: [related("/solutions/podcast-smart-links", "Share an episode everywhere", "Podcasts"), related("/solutions/deeplink-generator", "Plan app-aware handoffs", "Deep linking"), related("/templates", "Choose a release-page layout", "Templates")], seo: SEO_PAGES.musicSmartLinks,
  },
  {
    path: "/solutions/digital-product-smart-links", label: "Courses & downloads", title: "Move launch traffic toward checkout with less friction.",
    lead: "Connect a post, video, or newsletter to your course, download, or checkout page with a managed URL you can update between launches.",
    icon: FileDown, visual: "commerce", visualTitle: "Digital product path", destinations: ["Launch post", "Product page", "Checkout"],
    useWhen: "You sell through Gumroad, Lemon Squeezy, a course platform, or another hosted checkout and need cleaner campaign links around it.",
    steps: [block("Choose the correct sales page", "Use the product or checkout URL that explains the offer clearly and works for a new visitor outside your own session."), block("Tag each campaign source", "Build consistent UTM parameters for newsletter, social, partner, and video placements before shortening the URL."), block("Keep the launch link current", "Update the managed destination for a new cohort, version, or waitlist without replacing every shared campaign URL.")],
    capabilities: [block("Campaign-ready short links", "Use a readable slug or connected domain instead of exposing a long tagged checkout URL."), managedDestination, commonAnalytics],
    boundary: block("Checkout stays with the seller", "Linktery does not process payments, deliver files, or know whether a purchase completed. Use the commerce platform for orders and conversion reporting."),
    featureLink: { path: "/features/url-shortener", label: "Explore managed links" },
    faqs: [faq("Does Linktery sell or deliver the digital product?", "No. Linktery sends visitors to the product or checkout provider you configure."), faq("Can I keep the same link for the next cohort?", "Yes. Update the managed link to the current sales page or waitlist, then test it before the next promotion."), faq("How do I measure actual purchases?", "Use checkout-platform analytics for sales and Linktery analytics for click activity. Consistent UTM parameters help connect the reports.")],
    related: [related("/solutions/shopify-smart-links", "Route storefront traffic", "E-commerce"), related("/solutions/youtube-smart-links", "Keep video links current", "YouTube"), related("/tools/utm-builder", "Build campaign parameters", "Free tool")], seo: SEO_PAGES.digitalProductsSmartLinks,
  },
  {
    path: "/solutions/podcast-smart-links", label: "Podcasts", title: "Make the next episode easy to hear anywhere.",
    lead: "Share Apple Podcasts, Spotify, another listening app, and the episode's web page from one managed destination with a dependable fallback.",
    icon: Mic2, visual: "media", visualTitle: "Episode destinations", destinations: ["Apple Podcasts", "Spotify", "Episode page"],
    useWhen: "Listeners arrive from different devices and prefer different podcast apps, but every post and guest appearance needs one memorable URL.",
    steps: [block("Use canonical episode links", "Collect the official web URLs for the episode or show on each platform and keep the independent episode page as a fallback."), block("Order the listening options", "Place the services your audience uses most at the top, followed by show notes, newsletter, or membership links."), block("Measure the handoff", "Share one URL, then review destination clicks by source and device without treating a click as a completed listen.")],
    capabilities: [block("One page for every player", "Present listening services and supporting resources without choosing a platform for the visitor."), block("Supported app handoffs", "Attempt compatible podcast-app transitions while keeping normal web destinations."), commonAnalytics],
    boundary: block("A click is not a play", "Linktery does not host the audio or see listening completion inside a podcast platform. Use host and platform analytics for streams, follows, and retention."),
    featureLink: { path: "/features/deep-linking", label: "Explore deep linking" },
    faqs: [faq("Can I link to a specific episode?", "Yes. Use the episode's destination on each listening service rather than sending every campaign to the general show page."), faq("Will the podcast app always open?", "No. Supported handoffs depend on the device, installed app, and source browser. Keep the web destination useful."), faq("Does Linktery count listens?", "No. Linktery records link activity. Use your podcast host and listening platforms for play and retention data.")],
    related: [related("/solutions/music-smart-links", "Share a release across services", "Music"), related("/solutions/deeplink-generator", "Understand app handoffs", "Deep linking"), related("/guides/deep-links-and-in-app-browsers", "Test social webviews", "Guide")], seo: SEO_PAGES.podcastSmartLinks,
  },
  {
    path: "/solutions/shopify-smart-links", label: "E-commerce", title: "Bring campaign traffic to the right storefront.",
    lead: "Use managed commerce links for Shopify or another store, add campaign context, and route visitors to an appropriate product, collection, or regional page.",
    icon: ShoppingBag, visual: "commerce", visualTitle: "Storefront journey", destinations: ["Social campaign", "Product page", "Regional store"],
    useWhen: "Your store receives traffic from several campaigns or markets and long product URLs are difficult to maintain across every placement.",
    steps: [block("Pick the page that matches the promise", "Send a product post to that product, a collection campaign to the collection, and broad brand traffic to a useful landing page."), block("Add context before shortening", "Attach consistent source, medium, and campaign parameters so the store analytics can recognize the visit."), block("Add routing only where needed", "Use a default store first, then add country or device destinations for markets that genuinely require another experience.")],
    capabilities: [block("Managed commerce URLs", "Replace long tagged storefront URLs with a stable Linktery link that can be updated after launch."), block("Country and device rules", "Send configured traffic to regional stores or device-specific pages while retaining a default."), commonAnalytics],
    boundary: block("Store data stays in the store", "Linktery measures the click and route, not add-to-cart events, checkout completion, revenue, inventory, or customer identity. Use Shopify or the destination platform for commerce analytics."),
    featureLink: { path: "/features/geo-targeting", label: "Explore geo targeting" },
    faqs: [faq("Does this work only with Shopify?", "No. The destination can be a valid page on Shopify or another storefront. Linktery manages the link and routing around it."), faq("Can I route countries to separate stores?", "Yes, on plans that include geo targeting. Always configure a default destination for traffic without a matching rule."), faq("Can Linktery show completed orders?", "No. Linktery records link activity. Shopify or your commerce platform remains the source for orders, revenue, and checkout conversion.")],
    related: [related("/solutions/amazon-smart-links", "Share product recommendations", "Amazon"), related("/solutions/digital-product-smart-links", "Promote a digital product", "Digital products"), related("/guides/utm-parameters-guide", "Name campaign traffic", "Guide")], seo: SEO_PAGES.shopifySmartLinks,
  },
  {
    path: "/solutions/fanvue-ai-models", label: "Virtual creators", title: "Run every virtual creator from one public identity.",
    lead: "Create separate branded profiles, attach social and membership destinations, and use managed links to keep campaign traffic organized as the roster changes.",
    icon: WandSparkles, visual: "profile", visualTitle: "Virtual creator profile", destinations: ["Featured content", "Membership", "Social channel"],
    useWhen: "A virtual creator or agency needs a clear public profile and campaign links that can be managed without mixing every identity together.",
    steps: [block("Separate each public identity", "Give every creator a distinct name, visual system, slug, and set of destinations instead of sharing one generic agency page."), block("Attach transparent destinations", "Label social, content, community, and membership links clearly so visitors know where each action leads."), block("Manage campaigns around the profile", "Use separate managed links for promotions or an even rotator when multiple eligible destinations should receive traffic.")],
    capabilities: [block("Multiple Public Profiles", "Keep each creator's public presentation separate from the Linktery account and from the rest of the roster."), block("Managed campaign links", "Update destinations or distribute visits evenly across active variants without replacing the shared URL."), commonAnalytics],
    boundary: block("Do not hide the destination", "Use Linktery to organize and route legitimate traffic, not to cloak policy-restricted pages or mislead visitors. Each network and membership platform controls its own rules."),
    featureLink: { path: "/templates", label: "Explore profile templates" },
    faqs: [faq("Can an agency create separate profiles?", "Yes, subject to plan limits. Each Public Profile has its own public identity, slug, links, and profile analytics."), faq("Can I use different destinations in a campaign?", "Yes. You can update a managed destination or use equal rotation across active variants where Link Rotator is available."), faq("Does Linktery bypass platform moderation?", "No. Linktery does not override external platform policies or moderation. Keep profiles and destinations transparent and compliant.")],
    related: [related("/solutions/onlyfans-link-in-bio", "Organize membership links", "Creator memberships"), related("/solutions/affiliate-smart-link-rotator", "Compare destinations evenly", "Link rotation"), related("/templates", "Choose a creator layout", "Templates")], seo: SEO_PAGES.fanvueSmartLinks,
  },
  {
    path: "/solutions/geo-targeted-redirect", label: "Regional campaigns", title: "Make one campaign link useful across markets.",
    lead: "Route configured countries to a local store, language, currency, or resource while keeping a reliable default destination for everyone else.",
    icon: Globe2, visual: "routing", visualTitle: "Country routing", destinations: ["United States", "Germany", "Default market"],
    useWhen: "The same campaign runs across markets that have genuinely different inventory, language, pricing, regulations, or sales pages.",
    steps: [block("Start with the global fallback", "Choose a page that remains understandable outside any target market. It receives unmatched or uncertain traffic."), block("Add country destinations", "Map only the countries that need another page and keep the rule list small enough to audit before each campaign."), block("Verify from the destination back", "Test every regional URL, product, currency, and language choice, then monitor country-level click activity for gaps.")],
    capabilities: [block("Country rules", "Match the available country signal to a configured destination without creating a different public link for each market."), managedDestination, commonAnalytics],
    boundary: block("Country detection is not identity", "Network location can be affected by VPNs, relays, or carrier routing. Do not use inferred country as proof of residence, eligibility, or legal status."),
    featureLink: { path: "/features/geo-targeting", label: "Explore geo targeting" },
    faqs: [faq("What happens to an unconfigured country?", "The visitor goes to the default destination configured for the link."), faq("Can a VPN affect the result?", "Yes. The available network signal may reflect a VPN or relay rather than the visitor's physical location."), faq("Should every country have its own rule?", "Usually not. Add a country destination only when the visitor truly needs another store, language, resource, or campaign page.")],
    related: [related("/solutions/smart-link-redirect", "Combine routing signals", "Smart routing"), related("/solutions/shopify-smart-links", "Route storefront campaigns", "E-commerce"), related("/features/device-targeting", "Add device rules", "Feature")], seo: SEO_PAGES.geoTargetedRedirect,
  },
  {
    path: "/solutions/amazon-smart-links", label: "Amazon", title: "Share product recommendations with a cleaner path.",
    lead: "Turn a long Amazon product or Associates URL into a managed campaign link, retain its tracking parameters, and attempt a supported mobile handoff with a web fallback.",
    icon: Store, visual: "commerce", visualTitle: "Recommendation path", destinations: ["Content", "Managed link", "Amazon product"],
    useWhen: "Product recommendations live across posts, videos, newsletters, or QR codes and the public campaign URL needs to stay readable and measurable.",
    steps: [block("Begin with the compliant product URL", "Create the correct Amazon or Associates destination first, including the required tracking identifier and disclosure around the link."), block("Create the managed route", "Shorten the complete destination without stripping its query parameters, then use a clear slug for the product or collection."), block("Test web and app outcomes", "Check the link on iOS, Android, and desktop. The Amazon web page must remain useful when a native-app handoff does not occur.")],
    capabilities: [block("Readable recommendation links", "Keep a recognizable managed URL around a long product destination and its campaign parameters."), block("Supported app handoff", "Attempt compatible transitions to the Amazon app while retaining the normal product URL as fallback."), commonAnalytics],
    boundary: block("Affiliate compliance remains yours", "Linktery does not create Associates tags, verify product availability, or track commissions. Follow Amazon's current program rules and use its reporting for orders and earnings."),
    featureLink: { path: "/features/branded-links", label: "Explore branded links" },
    faqs: [faq("Will my Amazon Associates tag remain in the URL?", "Linktery redirects to the complete destination you save, including its query parameters. Test the final route before sharing."), faq("Will every phone open the Amazon app?", "No. The app, operating system, and source browser determine whether a supported handoff occurs. The web product page is the fallback."), faq("Can Linktery show affiliate orders or commission?", "No. Linktery records click activity. Amazon Associates remains the source for orders, attribution, and commission data.")],
    related: [related("/solutions/shopify-smart-links", "Manage storefront campaigns", "E-commerce"), related("/solutions/affiliate-smart-link-rotator", "Compare eligible offers", "Affiliate campaigns"), related("/guides/how-to-create-branded-short-url", "Build a branded short URL", "Guide")], seo: SEO_PAGES.amazonSmartLinks,
  },
  {
    path: "/solutions/ugc-portfolio", label: "UGC portfolio", title: "Send brands one portfolio link that stays current.",
    lead: "Put your strongest work, service information, collaboration details, and contact path into a focused mobile profile for every pitch.",
    icon: Images, visual: "portfolio", visualTitle: "Portfolio profile", destinations: ["Featured work", "Services", "Contact"],
    useWhen: "A brand or agency contact needs a fast overview of your work without downloading an old PDF or navigating several social profiles.",
    steps: [block("Lead with proof", "Choose a small set of relevant examples and link each card to the best hosted video, campaign page, or case study."), block("Make the next step obvious", "Add service or rate information only where it helps qualification, then keep a direct enquiry or contact path visible."), block("Create links for each pitch source", "Use a stable portfolio profile and source-specific managed links or UTM labels when you want to compare outreach channels.")],
    capabilities: [block("Customizable portfolio profile", "Use the profile identity, template, social links, and cards to present work in a branded structure."), managedDestination, commonAnalytics],
    boundary: block("Keep rich work where it performs best", "Linktery organizes the portfolio path. Host long-form case studies, high-resolution media, contracts, and quote workflows in the specialist tools you already use."),
    featureLink: { path: "/templates", label: "Explore profile templates" },
    faqs: [faq("Can I link to videos in my portfolio?", "Yes. Add cards that lead to hosted videos, campaign pages, or case studies. Test how those destinations behave on mobile."), faq("Can I change a project after sending the portfolio?", "Yes. Update or reorder the profile cards while keeping the portfolio's public URL the same."), faq("Can I tell whether a brand signed a contract?", "No. Linktery measures profile views and link clicks, not proposal acceptance or signed contracts in another service.")],
    related: [related("/solutions/link-in-bio-for-ugc-creators", "Plan a UGC creator profile", "For UGC creators"), related("/templates", "Choose a portfolio structure", "Templates"), related("/guides/how-to-create-a-link-in-bio", "Build a focused profile", "Guide")], seo: SEO_PAGES.ugcPortfolio,
  },
  {
    path: "/solutions/qr-code-biolink", label: "QR campaigns", title: "Print once. Keep the destination flexible.",
    lead: "Generate a QR code for a managed Linktery URL, place it on a card, menu, package, or poster, and update the link destination without reprinting the code.",
    icon: QrCode, visual: "qr", visualTitle: "Managed QR route", destinations: ["Printed QR", "Managed URL", "Current page"],
    useWhen: "A physical item will stay in circulation longer than the campaign page, menu, event, listing, or resource it points to.",
    steps: [block("Create the managed link first", "Choose the initial destination and a stable Linktery or custom-domain URL. This is the address the QR image will encode."), block("Generate and test the artwork", "Download a scalable QR code, test it at the intended print size, and preserve quiet space and contrast around the pattern."), block("Update the route, not the print", "When the campaign changes, edit the managed link destination and scan the existing printed code again before launch.")],
    capabilities: [block("Browser QR generator", "Create a downloadable SVG with the URL and colors you choose."), managedDestination, commonAnalytics],
    boundary: block("The pixels do not change", "The printed QR code is static. Flexibility comes from encoding a managed URL whose destination can change. If you encode the final destination directly, changing it requires a new QR code."),
    featureLink: { path: "/tools/qr-code-generator", label: "Open QR generator" },
    faqs: [faq("Is the QR image itself dynamic?", "No. The pattern always encodes the same URL. Point it to a managed Linktery link if you need to update the destination later."), faq("Can I use my own domain in the QR code?", "Yes, when your plan and domain setup support a connected custom domain. Test the complete redirect before printing."), faq("What should I test before printing?", "Scan the code on multiple phones at the actual size and distance, check contrast and quiet space, and confirm the managed destination works.")],
    related: [related("/tools/qr-code-generator", "Generate a QR code", "Free tool"), related("/guides/dynamic-vs-static-qr-codes", "Choose a QR setup", "Guide"), related("/features/url-shortener", "Create a managed link", "Feature")], seo: SEO_PAGES.qrCodeBiolink,
  },
];

const explicitByPath = new Map(explicitSolutions.map((solution) => [solution.path, solution]));

const seoByPath = new Map<string, PageSeoConfig>(Object.values(SEO_PAGES).filter((item) => item.canonical.startsWith("/solutions/")).map((item) => [item.canonical, item]));

const professionIcons = new Map(solutionProfessions.map((item) => [item.path, item.icon]));

function cleanLinkLabel(value: string): string {
  return value.replace(/^[^\p{L}\p{N}]+/u, "").replace(/^\p{So}+\s*/u, "").trim();
}

function professionDefinition(path: string): SolutionDetailDefinition | undefined {
  const prefix = "/solutions/link-in-bio-for-";
  if (!path.startsWith(prefix)) return undefined;
  const slug = path.slice(prefix.length);
  const profession = (professionsData as ProfessionRecord[]).find((item) => item.slug === slug);
  if (!profession) return undefined;
  const narrative = professionNarratives[slug];
  if (!narrative) return undefined;
  const destinations = profession.links.slice(0, 3).map((item) => cleanLinkLabel(item.title)) as [string, string, string];
  const currentIndex = solutionProfessions.findIndex((item) => item.path === path);
  const remainingProfessions = solutionProfessions.filter((item) => item.path !== path);
  const relatedStart = currentIndex < 0 ? 0 : Math.min(currentIndex, remainingProfessions.length - 1);
  const professionRelated = [...remainingProfessions.slice(relatedStart), ...remainingProfessions.slice(0, relatedStart)].slice(0, 2);
  const icon = professionIcons.get(path) ?? CircleUserRound;
  return {
    path, label: profession.name, title: profession.headline,
    lead: narrative.lead,
    icon, visual: "profile", visualTitle: `${profession.name} profile`, destinations,
    useWhen: narrative.useWhen,
    steps: narrative.steps,
    capabilities: narrative.capabilities,
    boundary: narrative.boundary,
    featureLink: narrative.featureLink,
    faqs: narrative.faqs,
    related: [
      ...professionRelated.map((item) => related(item.path, item.title, item.description)),
      related("/solutions/bio-link-tool", "Give every link one home", "Social bio"),
    ].slice(0, 3),
    seo: seoByPath.get(path) ?? { title: profession.seoTitle, description: profession.seoDescription, canonical: path },
  };
}

export function getSolutionDetail(path: string): SolutionDetailDefinition | undefined {
  return explicitByPath.get(path) ?? professionDefinition(path);
}

export const publishedSolutionPaths = [...new Set([
  ...solutionGuides.map((item) => item.path),
  ...(professionsData as ProfessionRecord[]).map((item) => `/solutions/link-in-bio-for-${item.slug}`),
])];

export const solutionVisuals = explicitSolutions.map((item) => item.visual);
