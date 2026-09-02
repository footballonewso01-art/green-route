import LegalPageShell, { type LegalSectionLink } from "@/components/legal/LegalPageShell";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { createPageBreadcrumbSchema } from "@/lib/breadcrumbSchema";
import styles from "@/components/legal/LegalPage.module.css";

const sections: LegalSectionLink[] = [
  { id: "privacy-overview", label: "Overview" },
  { id: "privacy-information", label: "Personal information" },
  { id: "privacy-cookies", label: "Cookies & tracking" },
  { id: "privacy-use", label: "How we use information" },
  { id: "privacy-legal-bases", label: "Legal bases" },
  { id: "privacy-sharing", label: "How we share information" },
  { id: "privacy-no-sale", label: "No sale" },
  { id: "privacy-rights", label: "Your rights" },
  { id: "privacy-retention", label: "Data retention" },
  { id: "privacy-security", label: "Security" },
  { id: "privacy-contact", label: "Contact" },
];

export default function PrivacyPolicy() {
  useSeo({
    ...SEO_PAGES.privacy,
    structuredData: createPageBreadcrumbSchema("Privacy Policy", SEO_PAGES.privacy.canonical),
  });
  return (
    <LegalPageShell documentKey="privacy" title="Privacy Policy" effectiveDate="March 2, 2026" sections={sections}>
      <section id="privacy-overview">
        <p>Linktery LLC (“Linktery,” “Company,” “we,” “us,” or “our”) is committed to protecting and respecting your privacy and personal data. This Privacy Policy explains how we collect, use, disclose, and otherwise process your personal information when you access our website (<a href="https://linktery.com">https://linktery.com</a>), interact with us, and use our services, including link-in-bio pages, link management, tracking, and redirect tools (collectively, the “Services”).</p>
        <p>It also describes your privacy rights, including those under the laws of the European Economic Area (“EEA”) and the United Kingdom (“UK”), where Linktery acts as a data controller.</p>
      </section>

      <section id="privacy-information">
        <h2>1. Personal Information We Collect</h2>
        <p>We collect personal information when you visit our website, register for an account, use our Services, interact with links created through our platform, or contact us directly.</p>
        <h3>Categories of Personal Information:</h3>
        <ul className={styles.categoryList}>
          <li><strong>a) Personal Identifiers</strong>Name, email address, username, password, profile data (bio, avatar, social links), IP address, and content you create.</li>
          <li><strong>b) Payment Information</strong>Billing details handled via third-party processors (Paddle or similar), transaction history, and subscription data.</li>
          <li><strong>c) Usage & Technical Data</strong>Device type, OS, browser, IP address, approximate location, pages visited, and link performance analytics.</li>
          <li><strong>d) Communications</strong>Messages sent to support, feedback, and inquiries.</li>
        </ul>
      </section>

      <section id="privacy-cookies"><h2>2. Cookies & Tracking Technologies</h2><p>We use cookies and similar technologies to ensure proper functionality of the platform, analyze traffic, improve user experience, and support marketing. Third-party providers (such as Google or Meta) may also use cookies on our services.</p></section>

      <section id="privacy-use">
        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide and operate our Services and manage your account.</li>
          <li>To improve and optimize product functionality and analyze usage patterns.</li>
          <li>To communicate updates, system messages, and support responses.</li>
          <li>To send promotional communications (where allowed).</li>
          <li>To prevent fraud, abuse, and ensure security and compliance.</li>
        </ul>
      </section>

      <section id="privacy-legal-bases"><h2>4. Legal Bases for Processing (EEA/UK)</h2><p>Linktery relies on contractual necessity, legitimate interests (improving and securing our platform), consent (for marketing and certain cookies), and legal obligations to process your data.</p></section>
      <section id="privacy-sharing"><h2>5. How We Share Information</h2><p>We share information with service providers (hosting, analytics, support tools), payment processors (Paddle), or when required by law or during business transfers.</p></section>
      <section id="privacy-no-sale"><h2>6. No Sale of Personal Information</h2><p>We do not sell your personal information for monetary value. Certain uses of cookies may be considered “sharing” under some jurisdictions.</p></section>
      <section id="privacy-rights"><h2>8. Your Privacy Rights</h2><p>Depending on your location, you may have the right to access, correct, delete, or object to the processing of your data. To exercise these rights, contact us at <span><strong>contact@linktery.com</strong></span>.</p></section>
      <section id="privacy-retention"><h2>9. Data Retention</h2><p>We retain personal information only as long as necessary to provide Services, comply with legal obligations, or resolve disputes.</p></section>
      <section id="privacy-security"><h2>10. Security</h2><p>We implement technical and organizational measures to protect your data, though no system is completely secure.</p></section>

      <section id="privacy-contact" className={styles.contact}>
        <h2>Contact Us</h2>
        <p>Email: contact@linktery.com<br />Linktery LLC<br />Website: <a href="https://linktery.com">https://linktery.com</a></p>
      </section>
    </LegalPageShell>
  );
}
