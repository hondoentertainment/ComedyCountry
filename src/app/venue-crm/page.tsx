import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVenueCRMData } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Venue CRM | Punchline Atlas",
  description: "Manage attendee relationships, track visits, and segment your audience.",
};

type PageProps = {
  searchParams: Promise<{
    venueId?: string;
    page?: string;
  }>;
};

export default async function VenueCRMPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const params = await searchParams;
  const venueId = params.venueId;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  let records: Array<{
    id: string;
    venueId: string;
    userId: string;
    visitCount: number;
    totalSpend: unknown;
    lastVisit: Date;
    tags: string | null;
    notes: string | null;
  }> = [];
  let total = 0;
  let pages = 1;

  if (venueId) {
    try {
      const result = await getVenueCRMData(venueId, currentPage);
      records = result.records;
      total = result.total;
      pages = result.pages;
    } catch {
      // DB not configured
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Venue CRM</h1>
          <p className="text-zinc-400 text-sm">
            Track attendees, visit history, and audience segments.
          </p>
        </div>

        {/* Venue selector */}
        <form
          method="get"
          className="flex gap-3 mb-8 p-4 rounded-xl bg-brand-surface border border-zinc-800/80"
        >
          <div className="flex-1">
            <input
              name="venueId"
              type="text"
              placeholder="Enter your Venue ID"
              defaultValue={venueId}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition"
          >
            Load CRM
          </button>
        </form>

        {!venueId && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">Enter a venue ID to view your CRM dashboard.</p>
            <p className="text-sm mt-1">You must be a claimed venue operator to access CRM data.</p>
          </div>
        )}

        {venueId && records.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">No CRM records found for this venue.</p>
          </div>
        )}

        {records.length > 0 && (
          <>
            <div className="mb-4 text-sm text-zinc-400">{total} attendee record{total !== 1 ? "s" : ""}</div>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-surface border-b border-zinc-800">
                    <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wide font-medium">User ID</th>
                    <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wide font-medium">Visits</th>
                    <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wide font-medium">Total Spend</th>
                    <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wide font-medium">Last Visit</th>
                    <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wide font-medium">Tags</th>
                    <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wide font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {records.map((rec) => {
                    let tagList: string[] = [];
                    try {
                      tagList = rec.tags ? JSON.parse(rec.tags) : [];
                    } catch {
                      tagList = rec.tags ? [rec.tags] : [];
                    }

                    return (
                      <tr key={rec.id} className="bg-brand-surface/50 hover:bg-zinc-800/40 transition">
                        <td className="px-4 py-3 text-sm text-white font-mono">{rec.userId.slice(0, 12)}...</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{rec.visitCount}</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">${Number(rec.totalSpend).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{new Date(rec.lastVisit).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tagList.map((tag) => (
                              <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-brand-gold/15 text-brand-gold">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 max-w-[200px] truncate">{rec.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <a
                    key={p}
                    href={`/venue-crm?venueId=${venueId}&page=${p}`}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      p === currentPage
                        ? "bg-brand-gold text-brand-dark"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {p}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
