import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-gray-400">Effective Date: March 2, 2026</p>
                </div>

                <div className="space-y-10 leading-relaxed text-gray-200">
                    <section>
                        <p>
                            Linktery LLC (“Linktery,” “Company,” “we,” “us,” or “our”) is committed to protecting and respecting your privacy and personal data. This Privacy Policy explains how we collect, use, disclose, and otherwise process your personal information when you access our website (<a href="https://linktery.com" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors">https://linktery.com</a>), interact with us, and use our services, including link-in-bio pages, link management, tracking, and redirect tools (collectively, the “Services”).
                        </p>
                        <p className="mt-4">
                            It also describes your privacy rights, including those under the laws of the European Economic Area (“EEA”) and the United Kingdom (“UK”), where Linktery acts as a data controller.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Personal Information We Collect</h2>
                        <p className="mb-4">We collect personal information when you visit our website, register for an account, use our Services, interact with links created through our platform, or contact us directly.</p>
                        <h3 className="text-white font-semibold mt-6 mb-2">Categories of Personal Information:</h3>
                        <ul className="space-y-4 list-none p-0">
                            <li>
                                <strong className="text-white block mb-1">a) Personal Identifiers</strong>
                                Name, email address, username, password, profile data (bio, avatar, social links), IP address, and content you create.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">b) Payment Information</strong>
                                Billing details handled via third-party processors (Paddle or similar), transaction history, and subscription data.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">c) Usage & Technical Data</strong>
                                Device type, OS, browser, IP address, approximate location, pages visited, and link performance analytics.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">d) Communications</strong>
                                Messages sent to support, feedback, and inquiries.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. Cookies & Tracking Technologies</h2>
                        <p>We use cookies and similar technologies to ensure proper functionality of the platform, analyze traffic, improve user experience, and support marketing. Third-party providers (such as Google or Meta) may also use cookies on our services.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To provide and operate our Services and manage your account.</li>
                            <li>To improve and optimize product functionality and analyze usage patterns.</li>
                            <li>To communicate updates, system messages, and support responses.</li>
                            <li>To send promotional communications (where allowed).</li>
                            <li>To prevent fraud, abuse, and ensure security and compliance.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Legal Bases for Processing (EEA/UK)</h2>
                        <p>Linktery relies on contractual necessity, legitimate interests (improving and securing our platform), consent (for marketing and certain cookies), and legal obligations to process your data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. How We Share Information</h2>
                        <p>We share information with service providers (hosting, analytics, support tools), payment processors (Paddle), or when required by law or during business transfers.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">6. No Sale of Personal Information</h2>
                        <p>We do not sell your personal information for monetary value. Certain uses of cookies may be considered “sharing” under some jurisdictions.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">8. Your Privacy Rights</h2>
                        <p>Depending on your location, you may have the right to access, correct, delete, or object to the processing of your data. To exercise these rights, contact us at <span className="text-white font-medium underline">contact@linktery.com</span>.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">9. Data Retention</h2>
                        <p>We retain personal information only as long as necessary to provide Services, comply with legal obligations, or resolve disputes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">10. Security</h2>
                        <p>We implement technical and organizational measures to protect your data, though no system is completely secure.</p>
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
