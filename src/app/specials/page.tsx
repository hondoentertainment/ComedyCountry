import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Comedy Specials | Punchline Atlas",
  description: "Browse and rate comedy specials from Netflix, HBO, YouTube, and more. Discover the highest-rated stand-up specials.",
};

export const dynamic = "force-dynamic";

export default async function SpecialsPage() {
  let specials: Array<{
    id: string; title: string; platform: string | null; releaseYear: number | null; url: string | null;
    comedian: { name: string; slug: string; headshotUrl: string | null };
    _avg: number | null; _count: number;
  }> = [];

  try {
    const raw = await prisma.comedianSpecial.findMany({
      include: {
        comedian: { select: { name: true, slug: true, headshotUrl: true } },
        ratings: { select: { rating: true } },
      },
      orderBy: { releaseYear: "desc" },
      take: 100,
    });

    specials = raw.map((s) => {
      const ratings = s.ratings;
      const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;
      return {
        id: s.id, title: s.title, platform: s.platform, releaseYear: s.releaseYear, url: s.url,
        comedian: s.comedian,
        _avg: avg, _count: ratings.length,
      };
    });
  } catch {
    // DB not configured
  }

  // Group by platform
  const platforms = new Map<string, typeof specials>();
  specials.forEach((s) => {
    const p = s.platform || "Other";
    const list = platforms.get(p) || [];
    list.push(s);
    platforms.set(p, list);
  });

  // Top rated
  const topRated = [...specials].filter((s) => s._count >= 1).sort((a, b) => (b._avg ?? 0) - (a._avg ?? 0)).slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Comedy Specials</h1>
      <p className="text-zinc-400 mb-10">
        Browse, rate, and discover the best stand-up specials across all platforms.
      </p>

      {/* Top Rated */}
      {topRated.length > 0 && (
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6">Highest Rated</h2>
          <div className="space-y-2">
            {topRated.map((s, i) => (
              <SpecialRow key={s.id} special={s} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* All Specials */}
      <section>
        <h2 className="text-xl font-bold text-white mb-6">All Specials</h2>
        {specials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {specials.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-lg bg-brand-surface border border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-charcoal overflow-hidden shrink-0 relative">
                    {s.comedian.headshotUrl ? (
                      <Image src={s.comedian.headshotUrl} alt={s.comedian.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">{s.comedian.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/comedians/${s.comedian.slug}`} className="text-white font-medium text-sm hover:text-brand-gold truncate block">
                      {s.comedian.name}
                    </Link>
                  </div>
                </div>
                <h3 className="text-white font-semibold truncate">{s.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                  {s.platform && <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{s.platform}</span>}
                  {s.releaseYear && <span>{s.releaseYear}</span>}
                  {s._count > 0 && (
                    <span className="text-brand-gold">
                      {"★".repeat(Math.round(s._avg ?? 0))} ({s._count})
                    </span>
                  )}
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand-gold text-xs hover:underline mt-2 inline-block">
                    Watch &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No specials found yet.</p>
        )}
      </section>
    </div>
  );
}

function SpecialRow({ special, rank }: { special: { id: string; title: string; platform: string | null; releaseYear: number | null; comedian: { name: string; slug: string; headshotUrl: string | null }; _avg: number | null; _count: number }; rank: number }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800">
      <span className="text-zinc-600 font-bold text-lg w-6 text-center shrink-0">{rank}</span>
      <div className="w-10 h-10 rounded-full bg-brand-charcoal overflow-hidden shrink-0 relative">
        {special.comedian.headshotUrl ? (
          <Image src={special.comedian.headshotUrl} alt={special.comedian.name} fill className="object-cover" sizes="40px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">{special.comedian.name.charAt(0)}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{special.title}</p>
        <p className="text-zinc-500 text-sm">
          <Link href={`/comedians/${special.comedian.slug}`} className="hover:text-brand-gold">{special.comedian.name}</Link>
          {special.platform && <> &middot; {special.platform}</>}
          {special.releaseYear && <> &middot; {special.releaseYear}</>}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-brand-gold font-medium">{special._avg?.toFixed(1) ?? "—"}</p>
        <p className="text-zinc-500 text-xs">{special._count} ratings</p>
      </div>
    </div>
  );
}
