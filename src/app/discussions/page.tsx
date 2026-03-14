import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Community Discussions | Punchline Atlas",
  description:
    "Join the conversation about comedians, venues, and comedy events.",
};

export const dynamic = "force-dynamic";

export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; entityId?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const entityType = sp.entityType;
  const entityId = sp.entityId;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  let threads: Array<{
    id: string;
    entityType: string;
    entityId: string;
    userId: string;
    title: string;
    body: string;
    isPinned: boolean;
    isLocked: boolean;
    createdAt: Date;
    _count: { replies: number };
  }> = [];
  let total = 0;

  try {
    const [t, c] = await Promise.all([
      prisma.discussionThread.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: { _count: { select: { replies: true } } },
      }),
      prisma.discussionThread.count({ where }),
    ]);
    threads = t;
    total = c;
  } catch {
    // DB not configured
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">
            Community Discussions
          </h1>
          <p className="text-zinc-400 mt-1">
            Talk about your favorite comedians, venues, and shows.
          </p>
        </div>
        {session && (
          <Link
            href={`/discussions/new${entityType ? `?entityType=${entityType}&entityId=${entityId}` : ""}`}
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors"
          >
            New Thread
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["all", "comedian", "venue", "event"].map((type) => {
          const active =
            type === "all" ? !entityType : entityType === type;
          return (
            <Link
              key={type}
              href={
                type === "all"
                  ? "/discussions"
                  : `/discussions?entityType=${type}`
              }
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {type === "all"
                ? "All"
                : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
            </Link>
          );
        })}
      </div>

      {/* Thread List */}
      {threads.length > 0 ? (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/discussions/${thread.id}`}
              className="block p-4 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {thread.isPinned && (
                      <span className="text-xs text-brand-gold font-medium">
                        PINNED
                      </span>
                    )}
                    {thread.isLocked && (
                      <span className="text-xs text-zinc-500 font-medium">
                        LOCKED
                      </span>
                    )}
                    <h3 className="font-semibold text-white truncate">
                      {thread.title}
                    </h3>
                  </div>
                  <p className="text-zinc-500 text-sm mt-1 line-clamp-2">
                    {thread.body}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                    <span className="bg-zinc-800 px-2 py-0.5 rounded">
                      {thread.entityType}
                    </span>
                    <span>{thread._count.replies} replies</span>
                    <span>
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500">
          No discussions yet. Be the first to start one!
        </p>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`/discussions?page=${page - 1}${entityType ? `&entityType=${entityType}` : ""}${entityId ? `&entityId=${entityId}` : ""}`}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-400 text-sm hover:text-white"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-zinc-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/discussions?page=${page + 1}${entityType ? `&entityType=${entityType}` : ""}${entityId ? `&entityId=${entityId}` : ""}`}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-400 text-sm hover:text-white"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
