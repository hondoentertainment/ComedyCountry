import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ListActions } from "@/components/ListActions";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const list = await prisma.comedyList.findUnique({ where: { id }, select: { title: true, description: true } });
  if (!list) return { title: "List Not Found" };
  return {
    title: `${list.title} | Comedy Lists`,
    description: list.description || `A curated comedy list: ${list.title}`,
  };
}

export const dynamic = "force-dynamic";

export default async function ListDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const list = await prisma.comedyList.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, profileName: true, name: true, image: true } },
      items: { orderBy: { sortOrder: "asc" } },
      _count: { select: { saves: true } },
    },
  });

  if (!list) notFound();
  if (!list.isPublic && list.userId !== session?.user?.id) notFound();

  // Resolve item entities
  const comedianIds = list.items.filter((i) => i.comedianId).map((i) => i.comedianId!);
  const eventIds = list.items.filter((i) => i.eventId).map((i) => i.eventId!);
  const venueIds = list.items.filter((i) => i.venueId).map((i) => i.venueId!);

  const [comedians, events, venues, userSaved] = await Promise.all([
    comedianIds.length > 0
      ? prisma.comedian.findMany({ where: { id: { in: comedianIds } }, select: { id: true, name: true, slug: true, headshotUrl: true } })
      : [],
    eventIds.length > 0
      ? prisma.event.findMany({ where: { id: { in: eventIds } }, include: { venue: { select: { name: true } }, comedians: { include: { comedian: { select: { name: true } } } } } })
      : [],
    venueIds.length > 0
      ? prisma.venue.findMany({ where: { id: { in: venueIds } }, select: { id: true, name: true, city: true, state: true } })
      : [],
    session?.user?.id
      ? prisma.comedyListSave.findUnique({ where: { userId_listId: { userId: session.user.id, listId: id } } })
      : null,
  ]);

  const comedianMap = new Map(comedians.map((c) => [c.id, c]));
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const venueMap = new Map(venues.map((v) => [v.id, v]));

  const isOwner = session?.user?.id === list.userId;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/lists" className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block">
        &larr; All lists
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">{list.title}</h1>
          {list.description && <p className="text-zinc-400 mt-2">{list.description}</p>}
          <p className="text-zinc-500 text-sm mt-2">
            by {list.user.profileName || list.user.name || "Anonymous"} &middot; {list.items.length} items &middot; {list._count.saves} saves
            {!list.isPublic && <span className="ml-2 text-zinc-600">(Private)</span>}
          </p>
        </div>
        {session && !isOwner && (
          <ListActions listId={id} initialSaved={!!userSaved} />
        )}
      </div>

      <div className="space-y-2">
        {list.items.map((item, i) => {
          if (item.comedianId) {
            const c = comedianMap.get(item.comedianId);
            if (!c) return null;
            return (
              <Link
                key={item.id}
                href={`/comedians/${c.slug}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <span className="text-zinc-600 font-bold w-6 text-center shrink-0">{i + 1}</span>
                <div className="w-10 h-10 rounded-full bg-brand-charcoal overflow-hidden shrink-0 relative">
                  {c.headshotUrl ? (
                    <Image src={c.headshotUrl} alt={c.name} fill className="object-cover" sizes="40px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">{c.name.charAt(0)}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{c.name}</p>
                  <p className="text-zinc-500 text-xs">Comedian</p>
                </div>
                {item.note && <p className="text-zinc-500 text-xs italic shrink-0 max-w-[200px] truncate">{item.note}</p>}
              </Link>
            );
          }
          if (item.eventId) {
            const e = eventMap.get(item.eventId);
            if (!e) return null;
            const title = e.title || e.comedians.map((ec) => ec.comedian.name).join(", ");
            return (
              <Link
                key={item.id}
                href={`/events/${e.id}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <span className="text-zinc-600 font-bold w-6 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{title}</p>
                  <p className="text-zinc-500 text-xs">Event at {e.venue.name}</p>
                </div>
              </Link>
            );
          }
          if (item.venueId) {
            const v = venueMap.get(item.venueId);
            if (!v) return null;
            return (
              <Link
                key={item.id}
                href={`/venues/${v.id}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <span className="text-zinc-600 font-bold w-6 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{v.name}</p>
                  <p className="text-zinc-500 text-xs">Venue in {v.city}, {v.state}</p>
                </div>
              </Link>
            );
          }
          return null;
        })}
        {list.items.length === 0 && (
          <p className="text-zinc-500 text-center py-8">This list is empty.</p>
        )}
      </div>
    </div>
  );
}
