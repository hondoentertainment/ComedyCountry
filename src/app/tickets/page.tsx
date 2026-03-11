import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTicketsForUser } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Tickets | Punchline Atlas",
  description: "View your purchased tickets and season passes.",
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    VALID: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    USED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    REFUNDED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    TRANSFERRED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}
    >
      {status}
    </span>
  );
}

export default async function MyTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/tickets");
  }

  let tickets: Awaited<ReturnType<typeof getTicketsForUser>> = [];
  let seasonPasses: Array<{
    id: string;
    name: string;
    venueId: string;
    totalShows: number;
    usedShows: number;
    price: { toString(): string };
    expiresAt: Date;
  }> = [];

  try {
    [tickets, seasonPasses] = await Promise.all([
      getTicketsForUser(session.user.id),
      prisma.seasonPass.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  } catch {
    // DB not configured
  }

  const upcomingTickets = tickets.filter(
    (t) => t.status === "VALID" && new Date(t.event.date) >= new Date()
  );
  const pastTickets = tickets.filter(
    (t) => t.status !== "VALID" || new Date(t.event.date) < new Date()
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">My Tickets</h1>
          <p className="text-zinc-400 text-sm">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} purchased
          </p>
        </div>

        {/* Upcoming Tickets */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">
            Upcoming Shows
          </h2>
          {upcomingTickets.length === 0 ? (
            <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6 text-center">
              <p className="text-zinc-400">No upcoming tickets.</p>
              <Link
                href="/events"
                className="inline-block mt-3 text-brand-gold hover:underline text-sm"
              >
                Browse events
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block rounded-card bg-brand-surface border border-zinc-800/80 p-5 hover:border-brand-gold/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold truncate">
                          {ticket.event.title ||
                            ticket.event.comedians
                              ?.map((ec) => ec.comedian.name)
                              .join(", ") ||
                            "Comedy Show"}
                        </h3>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <p className="text-zinc-400 text-sm">
                        {ticket.event.venue?.name}
                      </p>
                      <p className="text-zinc-500 text-sm">
                        {new Date(ticket.event.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                        {ticket.event.showtime
                          ? ` at ${ticket.event.showtime}`
                          : ""}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">
                        {ticket.ticketType?.name} &mdash; $
                        {ticket.purchasePrice.toString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-[8px] text-zinc-800 font-mono break-all leading-tight px-1">
                          {ticket.qrCode.slice(0, 16)}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-1">QR Code</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Season Passes */}
        {seasonPasses.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">
              Season Passes
            </h2>
            <div className="space-y-4">
              {seasonPasses.map((pass) => (
                <div
                  key={pass.id}
                  className="rounded-card bg-brand-surface border border-zinc-800/80 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-white font-semibold">{pass.name}</h3>
                      <p className="text-zinc-400 text-sm mt-1">
                        {pass.usedShows} / {pass.totalShows} shows used
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">
                        Expires{" "}
                        {new Date(pass.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-brand-gold font-semibold">
                        ${pass.price.toString()}
                      </p>
                      <div className="mt-2 w-24 bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-brand-gold rounded-full h-2"
                          style={{
                            width: `${(pass.usedShows / pass.totalShows) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past / Other Tickets */}
        {pastTickets.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              Past &amp; Other Tickets
            </h2>
            <div className="space-y-3">
              {pastTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block rounded-card bg-brand-surface border border-zinc-800/80 p-4 hover:border-zinc-700 transition-colors opacity-70"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-zinc-300 font-medium truncate text-sm">
                          {ticket.event.title ||
                            ticket.event.comedians
                              ?.map((ec) => ec.comedian.name)
                              .join(", ") ||
                            "Comedy Show"}
                        </h3>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <p className="text-zinc-500 text-xs">
                        {ticket.event.venue?.name} &mdash;{" "}
                        {new Date(ticket.event.date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </p>
                    </div>
                    <p className="text-zinc-500 text-sm">
                      ${ticket.purchasePrice.toString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
