import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function TermsAndConditions() {
    return (
        <div className="min-h-screen bg-background text-white selection:bg-accent/30 selection:text-white font-sans">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/logo.png" alt="Linktery" className="h-8 w-auto mix-blend-screen" />
                        <span className="text-lg font-bold tracking-tight">Linktery</span>
                    </Link>
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                <div className="mb-12 border-b border-white/10 pb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms & Conditions</h1>
                    <p className="text-gray-400">Effective Date: March 2, 2026</p>
                </div>

                <div className="space-y-10 leading-relaxed text-gray-200">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            Welcome to Linktery. These Terms & Conditions (“Terms”) are entered into by and between you and Linktery LLC (“Linktery,” “Company,” “we,” “us,” or “our”) and govern your access to and use of our website (<a href="https://linktery.com" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors">https://linktery.com</a>), including all content, features, and services such as link-in-bio pages, link management, redirects, analytics, and related tools (collectively, the “Platform”).
                        </p>
                        <p className="mt-4">
                            By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, you must not access or use the Platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. Changes to Terms</h2>
                        <p>We may revise and update these Terms from time to time at our sole discretion. All changes are effective immediately when posted. Your continued use of the Platform following the posting of revised Terms constitutes your acceptance of those changes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. Changes to Platform</h2>
                        <p>We reserve the right to modify, suspend, or discontinue any part of the Platform, including any content or services, at any time without notice. We are not liable if any part of the Platform is unavailable at any time or for any period.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Account Registration & Security</h2>
                        <p>To access certain features, you may be required to create an account. You must be at least 18 years old and provide accurate information. You are responsible for maintaining the confidentiality of your login credentials.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. User Content</h2>
                        <p>You grant Linktery LLC a worldwide, non-exclusive, royalty-free license to host, use, and display content you create through the Platform to provide and improve our Services. You are solely responsible for your User Content.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">6. Content Standards</h2>
                        <p>User Content must comply with all laws and must not contain misleading, fraudulent, infringing, hateful, or abusive material.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">11. Fees & Payments</h2>
                        <p>We offer both free and paid subscription plans billed on a recurring basis. Subscriptions renew automatically unless canceled. Refunds may be requested within 14 days of purchase. Payments are processed through third-party Merchant of Record services (e.g., Paddle).</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">13. Limitation of Liability</h2>
                        <p>To the maximum extent permitted by law, Linktery LLC is not liable for indirect, incidental, or consequential damages. Our total liability is limited to $100 USD or the amount paid in the past 12 months.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">19. Governing Law</h2>
                        <p>These Terms are governed by the laws of the State of Delaware, USA. Any disputes shall be resolved exclusively in the courts located in Delaware.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">22. Entire Agreement</h2>
                        <p>These Terms, together with the <Link to="/privacy" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors">Privacy Policy</Link>, constitute the entire agreement between you and Linktery LLC.</p>
                    </section>

                    <section className="pt-8 border-t border-white/10">
                        <p className="font-bold text-white">Contact Us</p>
                        <p className="mt-2 text-sm text-gray-400">
                            Email: contact@linktery.com<br />
                            Linktery LLC<br />
                            Website: <a href="https://linktery.com" className="hover:text-white transition-colors">https://linktery.com</a>
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
