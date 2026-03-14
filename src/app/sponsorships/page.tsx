import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sponsorships | Punchline Atlas",
  description: "Browse sponsorship opportunities for comedy events, comedians, and venues.",
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function SponsorshipsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter = params.status;

  let sponsorships: Array<{
    id: string;
    brandName: string;
    contactEmail: string;
    eventId: string | null;
    comedianId: string | null;
    venueId: string | null;
    package: string;
    amount: unknown;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
  }> = [];

  try {
    const where: Record<string, unknown> = {};
    if (statusFilter) where.status = statusFilter;

    sponsorships = await prisma.sponsorship.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    // DB not configured
  }

  const statuses = ["inquiry", "negotiating", "confirmed", "active", "completed"];

  const packageLabels: Record<string, string> = {
    logo: "Logo Placement",
    pre_show: "Pre-Show Branding",
    branded_content: "Branded Content",
    title_sponsor: "Title Sponsor",
  };

  const statusColors: Record<string, string> = {
    inquiry: "bg-blue-900/40 text-blue-400",
    negotiating: "bg-yellow-900/40 text-yellow-400",
    confirmed: "bg-green-900/40 text-green-400",
    active: "bg-brand-gold/20 text-brand-gold",
    completed: "bg-zinc-800 text-zinc-400",
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Sponsorship Marketplace</h1>
          <p className="text-zinc-400 text-sm">
            Browse sponsorship opportunities and submit inquiries for comedy events.
          </p>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <a
            href="/sponsorships"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              !statusFilter ? "bg-brand-gold text-brand-dark" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            All
          </a>
          {statuses.map((s) => (
            <a
              key={s}
              href={`/sponsorships?status=${s}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === s
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </a>
          ))}
        </div>

        {/* Inquiry form */}
        <div className="p-6 rounded-xl bg-brand-surface border border-zinc-800/80 mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Submit a Sponsorship Inquiry</h2>
          <form action="/api/sponsorships" method="POST" className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="brandName" className="block text-sm text-zinc-400 mb-1">Brand Name</label>
              <input
                id="brandName"
                name="brandName"
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="block text-sm text-zinc-400 mb-1">Contact Email</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label htmlFor="package" className="block text-sm text-zinc-400 mb-1">Package</label>
              <select
                id="package"
                name="package"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              >
                <option value="">Select package</option>
                <option value="logo">Logo Placement</option>
                <option value="pre_show">Pre-Show Branding</option>
                <option value="branded_content">Branded Content</option>
                <option value="title_sponsor">Title Sponsor</option>
              </select>
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm text-zinc-400 mb-1">Budget ($)</label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label htmlFor="eventId" className="block text-sm text-zinc-400 mb-1">Event ID (optional)</label>
              <input
                id="eventId"
                name="eventId"
                type="text"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label htmlFor="venueId" className="block text-sm text-zinc-400 mb-1">Venue ID (optional)</label>
              <input
                id="venueId"
                name="venueId"
                type="text"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition"
              >
                Submit Inquiry
              </button>
            </div>
          </form>
        </div>

        {/* Sponsorship list */}
        {sponsorships.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">No sponsorships found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sponsorships.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 flex items-start justify-between gap-4"
              >
                <div>
                  <h3 className="text-white font-semibold">{s.brandName}</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    {packageLabels[s.package] || s.package} &middot; ${Number(s.amount).toLocaleString()}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                    {s.eventId && <span>Event: {s.eventId.slice(0, 8)}...</span>}
                    {s.venueId && <span>Venue: {s.venueId.slice(0, 8)}...</span>}
                    {s.comedianId && <span>Comedian: {s.comedianId.slice(0, 8)}...</span>}
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                  {s.startDate && s.endDate && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(s.startDate).toLocaleDateString()} &ndash;{" "}
                      {new Date(s.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[s.status] || "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
