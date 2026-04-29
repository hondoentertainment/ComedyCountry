import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "Ticket Clicks | Admin | Punchline Atlas",
  description: "Affiliate ticket click dashboard — events with click counts.",
};

export const dynamic = "force-dynamic";

export default async function TicketClicksPage() {
  const auth = await requireAdmin();
  if (!auth.authorized) redirect(auth.status === 401 ? "/auth/signin" : "/");

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Aggregate ticket clicks by eventId
  const [totals, last7d, last30d] = await Promise.all([
    prisma.ticketClick.groupBy({
      by: ["eventId"],
      _count: { id: true },
    }),
    prisma.ticketClick.groupBy({
      by: ["eventId"],
      _count: { id: true },
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.ticketClick.groupBy({
      by: ["eventId"],
      _count: { id: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const totalMap = new Map(totals.map((t) => [t.eventId, t._count.id]));
  const last7dMap = new Map(last7d.map((t) => [t.eventId, t._count.id]));
  const last30dMap = new Map(last30d.map((t) => [t.eventId, t._count.id]));

  const eventIds = Array.from(new Set(totals.map((t) => t.eventId)));
  if (eventIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-brand-gold">Ticket Clicks</h1>
        <p className="text-zinc-400">No ticket clicks recorded yet.</p>
        <Link href="/admin" className="text-brand-gold hover:underline text-sm">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    include: {
      venue: true,
      comedians: { include: { comedian: true } },
    },
  });

  const rows = events
    .map((event) => {
      const title = event.title ?? event.comedians.map((ec) => ec.comedian.name).join(", ");
      return {
        eventId: event.id,
        title,
        venue: event.venue.name,
        total: totalMap.get(event.id) ?? 0,
        last7d: last7dMap.get(event.id) ?? 0,
        last30d: last30dMap.get(event.id) ?? 0,
        date: event.date,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-gold">Ticket Clicks</h1>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg bg-brand-surface border border-zinc-800 text-zinc-300 text-sm hover:border-zinc-700"
        >
          Admin Dashboard
        </Link>
      </div>
      <p className="text-zinc-400 text-sm">
        Affiliate ticket link clicks by event. Data from prisma.ticketClick.
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-brand-surface border-b border-zinc-800">
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Event</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Venue</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase text-right">Total</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase text-right">7d</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase text-right">30d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.eventId} className="border-b border-zinc-800/60 hover:bg-zinc-900/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/events/${row.eventId}`}
                    className="text-white hover:text-brand-gold font-medium"
                  >
                    {row.title}
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {row.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </td>
                <td className="px-4 py-3 text-zinc-400">{row.venue}</td>
                <td className="px-4 py-3 text-right font-mono text-brand-gold">{row.total}</td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">{row.last7d}</td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">{row.last30d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
