import Link from "next/link";
import Image from "next/image";
import { search } from "@/lib/search";
import { VENUE_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search | Punchline Atlas",
  description: "Search venues, comedians, and upcoming comedy events.",
};

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const results = term.length >= 2 ? await search(term, 10) : null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
        <p className="text-zinc-400 mb-8">
          Find venues, comedians, and upcoming shows.
        </p>

        {term.length < 2 ? (
          <p className="text-zinc-500">Enter at least 2 characters to search.</p>
        ) : !results ? (
          <p className="text-zinc-500">Searching…</p>
        ) : (
          <div className="space-y-10">
            {results.comedians.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Comedians ({results.comedians.length})
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {results.comedians.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/comedians/${c.slug}`}
                        className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700"
                      >
                        {c.headshotUrl ? (
                          <Image
                            src={c.headshotUrl}
                            alt=""
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-zinc-700 shrink-0 flex items-center justify-center text-xl text-zinc-500">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-white self-center">{c.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.venues.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Venues ({results.venues.length})
                </h2>
                <ul className="space-y-2">
                  {results.venues.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/venues/${v.id}`}
                        className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700"
                      >
                        <span className="font-medium text-white">{v.name}</span>
                        <span className="text-zinc-500 text-sm">
                          {v.city}, {v.state} • {VENUE_TYPE_LABELS[v.type] ?? v.type}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.events.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Events ({results.events.length})
                </h2>
                <ul className="space-y-2">
                  {results.events.map((e) => {
                    const title =
                      e.title ?? e.comedians.map((ec) => ec.comedian.name).join(", ");
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/events/${e.id}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700"
                        >
                          <span className="font-medium text-white">{title}</span>
                          <span className="text-zinc-500 text-sm">
                            {e.venue.name} — {new Date(e.date).toLocaleDateString()}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {results.venues.length === 0 &&
              results.comedians.length === 0 &&
              results.events.length === 0 && (
                <p className="text-zinc-500">No results for &ldquo;{term}&rdquo;</p>
              )}
          </div>
        )}
      </div>
    </main>
  );
}
