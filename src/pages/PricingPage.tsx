import { Link } from "react-router-dom";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    features: ["10 links", "Basic analytics", "1 profile page", "GreenRoute branding"],
  },
  {
    name: "Pro",
    price: "$19",
    description: "For creators and marketers",
    popular: true,
    features: ["Unlimited links", "Full analytics & geo data", "Custom domains", "Link cloaking", "QR codes", "No branding"],
  },
  {
    name: "Advanced",
    price: "$49",
    description: "For agencies and power users",
    features: ["Everything in Pro", "Smart geo routing", "A/B split testing", "API access", "Team members", "Priority support", "Dedicated account manager"],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">GreenRoute</span>
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
        </div>
      </nav>

      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Simple, transparent pricing. Start free and upgrade as you grow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`glass-card p-8 rounded-2xl relative flex flex-col h-full ${plan.popular ? "border-accent/50 shadow-glow" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-full">Most Popular</div>
                )}
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="text-4xl font-extrabold text-foreground mt-4">{plan.price}<span className="text-base font-normal text-muted-foreground">/mo</span></div>

                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-accent flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to="/register" className={`mt-8 block text-center py-3 rounded-xl font-medium transition-all duration-200 ${plan.popular ? "btn-primary-glow" : "border border-border hover:bg-surface-hover text-foreground"}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
