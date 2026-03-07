import Link from "next/link";

export const metadata = {
  title: "Pricing | Punchline Atlas",
  description: "Pro plans for comedy fans, comedians, and venues. Unlock analytics, ad-free experience, promoted placement, and more.",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "For casual comedy fans",
    features: [
      "Browse comedians & venues",
      "Follow comedians & venues",
      "RSVP to shows",
      "Write reviews & ratings",
      "Create comedy lists",
      "Comedy Wrapped (annual)",
    ],
    cta: "Get started",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Fan Pro",
    price: "$4.99",
    period: "/month",
    description: "For dedicated comedy fans",
    features: [
      "Everything in Free",
      "Ad-free experience",
      "Early access to new features",
      "Priority show notifications",
      "Exclusive comedy lists",
      "Advanced stats & insights",
    ],
    cta: "Start free trial",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Comedian Pro",
    price: "$14.99",
    period: "/month",
    description: "For working comedians",
    features: [
      "Everything in Fan Pro",
      "Verified badge on profile",
      "Analytics dashboard",
      "Audience demographics",
      "Show performance metrics",
      "Merch & tip jar links",
      "Promoted profile in search",
    ],
    cta: "Claim your profile",
    href: "/comedian-dashboard",
    highlight: true,
  },
  {
    name: "Comedian Premium",
    price: "$29.99",
    period: "/month",
    description: "For touring comedians",
    features: [
      "Everything in Comedian Pro",
      "Featured homepage placement",
      "City scene spotlights",
      "Full API access",
      "Priority support",
      "Custom profile themes",
      "Competitor analytics",
    ],
    cta: "Claim your profile",
    href: "/comedian-dashboard",
    highlight: false,
  },
];

const venuePlans = [
  {
    name: "Venue Pro",
    price: "$49.99",
    period: "/month",
    description: "For comedy clubs & theaters",
    features: [
      "Promoted venue listing",
      "Venue analytics dashboard",
      "Event management tools",
      "Audience insights",
      "Featured in city scene pages",
      "Priority event placement",
    ],
    highlight: false,
  },
  {
    name: "Venue Premium",
    price: "$99.99",
    period: "/month",
    description: "For major venues & festivals",
    features: [
      "Everything in Venue Pro",
      "Homepage featured placement",
      "City takeover sponsorship",
      "API access for integrations",
      "Priority support",
      "Custom branding options",
      "Ticket sales analytics",
    ],
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-brand-gold mb-3">Plans & Pricing</h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          From casual fans to touring comedians and major venues. Choose the plan that fits your comedy journey.
        </p>
      </div>

      {/* Fan & Comedian Plans */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-white mb-6 text-center">For Fans & Comedians</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-6 rounded-xl border flex flex-col ${
                plan.highlight
                  ? "bg-brand-gold/5 border-brand-gold/40 ring-1 ring-brand-gold/20"
                  : "bg-brand-surface border-zinc-800"
              }`}
            >
              {plan.highlight && (
                <span className="text-xs font-bold text-brand-gold uppercase tracking-wide mb-2">Most Popular</span>
              )}
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="text-zinc-500 text-sm mb-4">{plan.description}</p>
              <p className="mb-6">
                <span className="text-3xl font-bold text-brand-gold">{plan.price}</span>
                {plan.period && <span className="text-zinc-500 text-sm">{plan.period}</span>}
              </p>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-zinc-300 text-sm">
                    <svg className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block text-center px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  plan.highlight
                    ? "bg-brand-gold text-brand-dark hover:bg-brand-gold/90"
                    : "bg-brand-surface border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Venue Plans */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-white mb-6 text-center">For Venues & Promoters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {venuePlans.map((plan) => (
            <div
              key={plan.name}
              className={`p-6 rounded-xl border ${
                plan.highlight
                  ? "bg-brand-gold/5 border-brand-gold/40 ring-1 ring-brand-gold/20"
                  : "bg-brand-surface border-zinc-800"
              }`}
            >
              {plan.highlight && (
                <span className="text-xs font-bold text-brand-gold uppercase tracking-wide mb-2 block">Recommended</span>
              )}
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="text-zinc-500 text-sm mb-4">{plan.description}</p>
              <p className="mb-6">
                <span className="text-3xl font-bold text-brand-gold">{plan.price}</span>
                <span className="text-zinc-500 text-sm">{plan.period}</span>
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-zinc-300 text-sm">
                    <svg className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="block text-center px-4 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors"
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Advertising */}
      <section className="p-8 rounded-xl bg-brand-surface border border-zinc-800 text-center">
        <h2 className="text-xl font-bold text-white mb-3">Advertising & Sponsorship</h2>
        <p className="text-zinc-400 max-w-xl mx-auto mb-6">
          Reach comedy fans nationwide with promoted listings, event features, city takeovers, and display advertising.
          Custom packages available for brands and promoters.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
          <div className="p-4 rounded-lg bg-brand-charcoal border border-zinc-800">
            <p className="text-brand-gold font-bold text-lg">$5 CPM</p>
            <p className="text-zinc-500 text-xs">Display Ads</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-charcoal border border-zinc-800">
            <p className="text-brand-gold font-bold text-lg">$25/day</p>
            <p className="text-zinc-500 text-xs">Featured Event</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-charcoal border border-zinc-800">
            <p className="text-brand-gold font-bold text-lg">$199/week</p>
            <p className="text-zinc-500 text-xs">City Takeover</p>
          </div>
        </div>
        <a
          href="mailto:ads@punchlineatlas.com"
          className="text-brand-gold hover:underline text-sm"
        >
          Contact us for custom packages &rarr;
        </a>
      </section>

      {/* Affiliate Revenue Note */}
      <section className="mt-12 text-center">
        <h2 className="text-lg font-bold text-white mb-2">Ticket Affiliate Program</h2>
        <p className="text-zinc-500 text-sm max-w-lg mx-auto">
          We earn a small commission when fans purchase tickets through our links.
          This helps keep Punchline Atlas free for everyone. Venues and promoters
          can partner with us for enhanced ticket tracking and analytics.
        </p>
      </section>
    </div>
  );
}
