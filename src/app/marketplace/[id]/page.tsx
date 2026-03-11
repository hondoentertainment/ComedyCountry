import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Listing Detail | Punchline Atlas",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;

  let listing: Awaited<ReturnType<typeof prisma.talentListing.findUnique>> & {
    applications?: Array<{
      id: string;
      comedianId: string;
      userId: string;
      message: string | null;
      askingFee: unknown;
      status: string;
      createdAt: Date;
    }>;
  } | null = null;

  try {
    listing = await prisma.talentListing.findUnique({
      where: { id },
      include: { applications: { orderBy: { createdAt: "desc" } } },
    });
  } catch {
    // DB not configured
  }

  if (!listing) return notFound();

  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user?.id;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-brand-gold/20 text-brand-gold">
              {listing.showType.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                listing.status === "open"
                  ? "bg-green-900/40 text-green-400"
                  : listing.status === "filled"
                  ? "bg-blue-900/40 text-blue-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Gig Listing &mdash; {new Date(listing.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h1>
        </div>

        {/* Details */}
        <div className="grid gap-6 md:grid-cols-2 mb-10">
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80">
            <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
            <dl className="space-y-3">
              {listing.genre && (
                <div>
                  <dt className="text-xs text-zinc-500 uppercase tracking-wide">Genre</dt>
                  <dd className="text-white">{listing.genre}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-zinc-500 uppercase tracking-wide">Date</dt>
                <dd className="text-white">{new Date(listing.date).toLocaleDateString()}</dd>
              </div>
              {(listing.budgetMin || listing.budgetMax) && (
                <div>
                  <dt className="text-xs text-zinc-500 uppercase tracking-wide">Budget Range</dt>
                  <dd className="text-white">
                    {listing.budgetMin ? `$${Number(listing.budgetMin)}` : "TBD"}
                    {" - "}
                    {listing.budgetMax ? `$${Number(listing.budgetMax)}` : "TBD"}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {listing.description && (
            <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80">
              <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
              <p className="text-zinc-300 whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}
        </div>

        {/* Apply form (for comedians) */}
        {listing.status === "open" && isAuthenticated && (
          <div className="p-6 rounded-xl bg-brand-surface border border-zinc-800/80 mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Apply for This Gig</h2>
            <form
              action="/api/marketplace/applications"
              method="POST"
              className="space-y-4"
            >
              <input type="hidden" name="listingId" value={listing.id} />
              <div>
                <label htmlFor="comedianId" className="block text-sm text-zinc-400 mb-1">
                  Comedian Profile ID
                </label>
                <input
                  id="comedianId"
                  name="comedianId"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  placeholder="Your comedian ID"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm text-zinc-400 mb-1">
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  placeholder="Tell the venue about yourself..."
                />
              </div>
              <div>
                <label htmlFor="askingFee" className="block text-sm text-zinc-400 mb-1">
                  Asking Fee (optional)
                </label>
                <input
                  id="askingFee"
                  name="askingFee"
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  placeholder="$0.00"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition"
              >
                Submit Application
              </button>
            </form>
          </div>
        )}

        {/* Applications list (for venue owners) */}
        {listing.applications && listing.applications.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Applications ({listing.applications.length})
            </h2>
            <div className="space-y-3">
              {listing.applications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl bg-brand-surface border border-zinc-800/80 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-white font-medium">Comedian: {app.comedianId}</p>
                    {app.message && <p className="text-zinc-400 text-sm mt-1">{app.message}</p>}
                    {app.askingFee && (
                      <p className="text-zinc-300 text-sm mt-1">
                        Asking: ${Number(app.askingFee)}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      app.status === "accepted"
                        ? "bg-green-900/40 text-green-400"
                        : app.status === "rejected"
                        ? "bg-red-900/40 text-red-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
