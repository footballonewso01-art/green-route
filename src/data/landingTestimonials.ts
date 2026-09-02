import anastasiaKlyuchkovaPortrait from "@/assets/testimonial-elena-volkova.webp";
import jamesCarterPortrait from "@/assets/testimonial-james-carter.webp";
import marcusThompsonPortrait from "@/assets/testimonial-marcus-thompson.webp";
import sarahBennettPortrait from "@/assets/testimonial-sarah-bennett.webp";

export interface LandingTestimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  avatarUrl?: string;
  sourceUrl?: string;
}

// Customer quotations and author details supplied for publication by Linktery.
export const publishedTestimonials: readonly LandingTestimonial[] = [
  {
    id: "sarah-bennett",
    quote: "Managing client links and campaign landing pages used to be messy — outdated links, scattered stats, constant back-and-forth. Linktery put everything in one place: clean pages, flexible blocks, and clear analytics. Within two weeks of rolling it out across several clients, we saw noticeably higher click-through rates. Being able to quickly rearrange links for active campaigns saves our team real time.",
    author: "Sarah Bennett",
    role: "CEO, marketing agency",
    avatarUrl: sarahBennettPortrait,
  },
  {
    id: "marcus-thompson",
    quote: "We use Linktery as the main entry point from all our social channels. The ability to create separate pages for different products and clearly see where traffic is coming from is especially useful. The interface is straightforward, even for people who don’t enjoy complicated tools. Compared to what we used before, it’s noticeably faster and cleaner.",
    author: "Marcus Thompson",
    role: "Founder of an online school",
    avatarUrl: marcusThompsonPortrait,
  },
  {
    id: "anastasia-klyuchkova",
    quote: "I care a lot about how the page looks — it needs to feel on-brand and not like a generic template. Linktery lets me customize the design properly, add custom buttons, and still keep everything looking polished. The short links are reliable too, no weird redirects. It’s become my main tool for all external links.",
    author: "Anastasia Klyuchkova",
    role: "Content creator, 180k followers",
    avatarUrl: anastasiaKlyuchkovaPortrait,
  },
  {
    id: "james-carter",
    quote: "We tested several Linktree- and Bitly-style solutions. Linktery won because of the analytics and the ability to add UTM parameters directly in the interface. It’s also convenient that multiple team members can have access while we keep control over what’s published. Three months in and we haven’t had any major issues.",
    author: "James Carter",
    role: "E-commerce Marketing Manager",
    avatarUrl: jamesCarterPortrait,
  },
];

export function getLandingTestimonials() {
  return { items: publishedTestimonials, isPreview: false };
}
