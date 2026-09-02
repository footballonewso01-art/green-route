import { Link } from "react-router-dom";
import LegalPageShell, { type LegalSectionLink } from "@/components/legal/LegalPageShell";
import styles from "@/components/legal/LegalPage.module.css";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { createPageBreadcrumbSchema } from "@/lib/breadcrumbSchema";

const sections: LegalSectionLink[] = [
  { id: "terms-acceptance", label: "Acceptance of terms" },
  { id: "terms-changes", label: "Changes to terms" },
  { id: "terms-platform", label: "Changes to platform" },
  { id: "terms-account", label: "Account & security" },
  { id: "terms-content", label: "User content" },
  { id: "terms-standards", label: "Content standards" },
  { id: "terms-fees", label: "Fees & payments" },
  { id: "terms-liability", label: "Liability" },
  { id: "terms-law", label: "Governing law" },
  { id: "terms-agreement", label: "Entire agreement" },
  { id: "terms-contact", label: "Contact" },
];

export default function TermsAndConditions() {
  useSeo({
    ...SEO_PAGES.terms,
    structuredData: createPageBreadcrumbSchema("Terms & Conditions", SEO_PAGES.terms.canonical),
  });
  return (
    <LegalPageShell documentKey="terms" title="Terms & Conditions" effectiveDate="March 2, 2026" sections={sections}>
      <section id="terms-acceptance">
        <h2>1. Acceptance of Terms</h2>
        <p>Welcome to Linktery. These Terms & Conditions (“Terms”) are entered into by and between you and Linktery LLC (“Linktery,” “Company,” “we,” “us,” or “our”) and govern your access to and use of our website (<a href="https://linktery.com">https://linktery.com</a>), including all content, features, and services such as link-in-bio pages, link management, redirects, analytics, and related tools (collectively, the “Platform”).</p>
        <p>By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, you must not access or use the Platform.</p>
      </section>

      <section id="terms-changes"><h2>2. Changes to Terms</h2><p>We may revise and update these Terms from time to time at our sole discretion. All changes are effective immediately when posted. Your continued use of the Platform following the posting of revised Terms constitutes your acceptance of those changes.</p></section>
      <section id="terms-platform"><h2>3. Changes to Platform</h2><p>We reserve the right to modify, suspend, or discontinue any part of the Platform, including any content or services, at any time without notice. We are not liable if any part of the Platform is unavailable at any time or for any period.</p></section>
      <section id="terms-account"><h2>4. Account Registration & Security</h2><p>To access certain features, you may be required to create an account. You must be at least 18 years old and provide accurate information. You are responsible for maintaining the confidentiality of your login credentials.</p></section>
      <section id="terms-content"><h2>5. User Content</h2><p>You grant Linktery LLC a worldwide, non-exclusive, royalty-free license to host, use, and display content you create through the Platform to provide and improve our Services. You are solely responsible for your User Content.</p></section>
      <section id="terms-standards"><h2>6. Content Standards</h2><p>User Content must comply with all laws and must not contain misleading, fraudulent, infringing, hateful, or abusive material.</p></section>
      <section id="terms-fees"><h2>11. Fees & Payments</h2><p>We offer both free and paid subscription plans billed on a recurring basis. Subscriptions renew automatically unless canceled. Refunds may be requested within 14 days of purchase. Payments are processed through third-party Merchant of Record services (e.g., Paddle).</p></section>
      <section id="terms-liability"><h2>13. Limitation of Liability</h2><p>To the maximum extent permitted by law, Linktery LLC is not liable for indirect, incidental, or consequential damages. Our total liability is limited to $100 USD or the amount paid in the past 12 months.</p></section>
      <section id="terms-law"><h2>19. Governing Law</h2><p>These Terms are governed by the laws of the State of Delaware, USA. Any disputes shall be resolved exclusively in the courts located in Delaware.</p></section>
      <section id="terms-agreement"><h2>22. Entire Agreement</h2><p>These Terms, together with the <Link to="/privacy">Privacy Policy</Link>, constitute the entire agreement between you and Linktery LLC.</p></section>

      <section id="terms-contact" className={styles.contact}>
        <h2>Contact Us</h2>
        <p>Email: contact@linktery.com<br />Linktery LLC<br />Website: <a href="https://linktery.com">https://linktery.com</a></p>
      </section>
    </LegalPageShell>
  );
}
