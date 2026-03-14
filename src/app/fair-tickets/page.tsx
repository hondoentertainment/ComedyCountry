import Link from "next/link";

export const metadata = {
  title: "Fair Ticketing | ComedyCountry",
  description:
    "Our anti-scalping fair ticketing system ensures transparent pricing, identity verification, and controlled resale for comedy shows.",
};

export default function FairTicketsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-10">
        <h1 className="mb-3 text-3xl font-bold text-white">
          Fair Ticketing — No Scalpers, No Hidden Fees
        </h1>
        <p className="text-lg text-gray-400">
          We believe every comedy fan deserves a fair shot at tickets at a fair
          price. Our anti-scalping system protects fans, supports artists, and
          keeps comedy accessible.
        </p>
      </header>

      {/* Philosophy Section */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Our Fair Ticketing Philosophy
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <div className="mb-3 text-2xl">$</div>
            <h3 className="mb-2 font-semibold text-white">
              Transparent Pricing
            </h3>
            <p className="text-sm text-gray-400">
              Every fee is shown upfront. Base price, service fee, processing
              fee — all visible before you click buy. No surprise charges at
              checkout.
            </p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <div className="mb-3 text-2xl">ID</div>
            <h3 className="mb-2 font-semibold text-white">
              Identity Verification
            </h3>
            <p className="text-sm text-gray-400">
              Tickets are tied to verified identities via email, phone, or
              ID scan. Scalpers cannot mass-buy tickets because each one must
              be verified.
            </p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <div className="mb-3 text-2xl">#</div>
            <h3 className="mb-2 font-semibold text-white">Fair Waitlist</h3>
            <p className="text-sm text-gray-400">
              Sold-out shows use a FIFO queue — first come, first served. When
              tickets become available, the next person in line gets a
              time-limited offer. No bots, no bidding wars.
            </p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <div className="mb-3 text-2xl">%</div>
            <h3 className="mb-2 font-semibold text-white">
              Controlled Resale
            </h3>
            <p className="text-sm text-gray-400">
              If resale is allowed, prices are capped at a venue-set maximum
              above face value. Artists receive a share of any resale profit.
              No gouging.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-white">How It Works</h2>
        <div className="space-y-4">
          <div className="flex gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-dark font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-semibold text-white">Browse & See True Prices</h3>
              <p className="text-sm text-gray-400">
                All ticket listings show the total price with every fee included.
                What you see is what you pay.
              </p>
            </div>
          </div>
          <div className="flex gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-dark font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-semibold text-white">Purchase & Verify</h3>
              <p className="text-sm text-gray-400">
                After purchase, verify your identity to activate anti-scalping
                protection. This ensures tickets stay with real fans.
              </p>
            </div>
          </div>
          <div className="flex gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-dark font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Resale? Only Through Us
              </h3>
              <p className="text-sm text-gray-400">
                Need to sell your ticket? List it through our platform at a
                capped price. The artist gets a cut of any profit, and the
                buyer knows it is legitimate.
              </p>
            </div>
          </div>
          <div className="flex gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-dark font-bold text-sm">
              4
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Sold Out? Join the Fair Queue
              </h3>
              <p className="text-sm text-gray-400">
                If a show is sold out, join the waitlist. When tickets open up,
                the next person in line gets a time-limited offer at face value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Venues */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-white">
          For Venues & Promoters
        </h2>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <p className="text-gray-400 mb-4">
            Set up fair ticketing policies for your events with full control:
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-0.5">*</span>
              <span>
                Toggle transparent pricing to show all fees upfront
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-0.5">*</span>
              <span>
                Enable or disable resale on a per-event basis
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-0.5">*</span>
              <span>
                Set maximum resale markup percentages
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-0.5">*</span>
              <span>
                Configure artist revenue share on resale profits
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-0.5">*</span>
              <span>
                Enable anti-scalping detection for suspicious buying patterns
              </span>
            </li>
          </ul>
          <div className="mt-4">
            <Link
              href="/venue-dashboard"
              className="inline-block rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-gold/90 transition-colors"
            >
              Set Up Fair Ticketing
            </Link>
          </div>
        </div>
      </section>

      {/* Anti-Scalping Detection */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">
          Anti-Scalping Detection
        </h2>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6">
          <p className="text-gray-400 mb-3">
            Our system automatically monitors for suspicious purchasing patterns:
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              Bulk purchases — flagged when a single user buys 6+ tickets in
              24 hours
            </li>
            <li>
              Rapid resale — flagged when a user lists 3+ tickets for resale
              within a week
            </li>
            <li>
              Pattern matching — cross-referenced against known scalping
              behaviors
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            Flagged accounts are reviewed by venue operators before any action
            is taken. We believe in fair enforcement.
          </p>
        </div>
      </section>
    </main>
  );
}
