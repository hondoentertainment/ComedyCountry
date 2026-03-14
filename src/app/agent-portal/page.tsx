import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgentRoster } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agent Portal | Punchline Atlas",
  description: "Manage your comedy roster, view aggregate stats, and track bookings.",
};

export default async function AgentPortalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  let roster: Awaited<ReturnType<typeof getAgentRoster>> = [];

  try {
    roster = await getAgentRoster(session.user.id);
  } catch {
    // DB not configured
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Agent Portal</h1>
            <p className="text-zinc-400 text-sm">
              {roster.length} comedian{roster.length !== 1 ? "s" : ""} on your roster
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 text-center">
            <p className="text-3xl font-bold text-brand-gold">{roster.length}</p>
            <p className="text-sm text-zinc-400 mt-1">Total Clients</p>
          </div>
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 text-center">
            <p className="text-3xl font-bold text-brand-gold">
              {roster.filter((r) => !r.endDate).length}
            </p>
            <p className="text-sm text-zinc-400 mt-1">Active</p>
          </div>
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 text-center">
            <p className="text-3xl font-bold text-brand-gold">
              {roster.filter((r) => r.commission).length > 0
                ? `${Number(
                    roster
                      .filter((r) => r.commission)
                      .reduce((sum, r) => sum + Number(r.commission), 0) /
                      roster.filter((r) => r.commission).length
                  ).toFixed(1)}%`
                : "—"}
            </p>
            <p className="text-sm text-zinc-400 mt-1">Avg Commission</p>
          </div>
        </div>

        {/* Roster */}
        {roster.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">Your roster is empty.</p>
            <p className="text-sm mt-1">Add comedians to start managing bookings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roster.map((entry) => (
              <div
                key={entry.id}
                className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="text-white font-semibold">
                    {entry.comedian?.name ?? entry.comedianId}
                  </h3>
                  <div className="flex gap-4 mt-1 text-sm text-zinc-400">
                    <span>Since {new Date(entry.startDate).toLocaleDateString()}</span>
                    {entry.commission && <span>Commission: {Number(entry.commission)}%</span>}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    entry.endDate
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-green-900/40 text-green-400"
                  }`}
                >
                  {entry.endDate ? "Ended" : "Active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
