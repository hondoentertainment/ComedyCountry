import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Community Leaderboard | Punchline Atlas",
  description:
    "Top reviewers, most active members, and comedy critics in the Punchline Atlas community.",
};

export const revalidate = 300;

type LeaderboardEntry = {
  userId: string;
  name: string | null;
  profileName: string | null;
  username: string | null;
  image: string | null;
  count: number;
  helpfulCount?: number;
};

async function getTopReviewers(limit = 20): Promise<LeaderboardEntry[]> {
  const results = await prisma.eventReview.groupBy({
    by: ["userId"],
    _count: true,
    orderBy: { _count: { userId: "desc" } },
    take: limit,
  });

  const userIds = results.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      profileName: true,
      username: true,
      image: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Get helpful reaction counts per user
  const reviews = await prisma.eventReview.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  });
  const reviewIds = reviews.map((r) => r.id);
  const reactions =
    reviewIds.length > 0
      ? await prisma.reviewReaction.groupBy({
          by: ["reviewId"],
          where: {
            reviewType: "event_review",
            reviewId: { in: reviewIds },
            reactionType: "helpful",
          },
          _count: true,
        })
      : [];
  const helpfulByReview = new Map(reactions.map((r) => [r.reviewId, r._count]));
  const helpfulByUser = new Map<string, number>();
  for (const r of reviews) {
    const count = helpfulByReview.get(r.id) ?? 0;
    helpfulByUser.set(r.userId, (helpfulByUser.get(r.userId) ?? 0) + count);
  }

  return results.map((r) => {
    const u = userMap.get(r.userId);
    return {
      userId: r.userId,
      name: u?.name ?? null,
      profileName: u?.profileName ?? null,
      username: u?.username ?? null,
      image: u?.image ?? null,
      count: r._count,
      helpfulCount: helpfulByUser.get(r.userId) ?? 0,
    };
  });
}

async function getTopTierRaters(limit = 20): Promise<LeaderboardEntry[]> {
  const results = await prisma.comedianTierRating.groupBy({
    by: ["userId"],
    _count: true,
    orderBy: { _count: { userId: "desc" } },
    take: limit,
  });

  const userIds = results.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      profileName: true,
      username: true,
      image: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return results.map((r) => {
    const u = userMap.get(r.userId);
    return {
      userId: r.userId,
      name: u?.name ?? null,
      profileName: u?.profileName ?? null,
      username: u?.username ?? null,
      image: u?.image ?? null,
      count: r._count,
    };
  });
}

function LeaderboardTable({
  entries,
  label,
}: {
  entries: LeaderboardEntry[];
  label: string;
}) {
  return (
    <div className="rounded-card bg-brand-surface border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-zinc-500 font-medium px-4 py-3 w-12">
              #
            </th>
            <th className="text-left text-zinc-500 font-medium px-4 py-3">
              Member
            </th>
            <th className="text-right text-zinc-500 font-medium px-4 py-3">
              {label}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const displayName = entry.profileName || entry.name || "Anonymous";
            return (
              <tr
                key={entry.userId}
                className="border-b border-zinc-800/50 last:border-0"
              >
                <td className="px-4 py-3 text-zinc-500 font-medium">
                  {i < 3 ? (
                    <span
                      className={
                        i === 0
                          ? "text-brand-gold"
                          : i === 1
                            ? "text-zinc-300"
                            : "text-amber-700"
                      }
                    >
                      {i + 1}
                    </span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={entry.username ? `/u/${entry.username}` : "#"}
                    className="flex items-center gap-3 hover:text-brand-gold transition-colors"
                  >
                    {entry.image ? (
                      <Image
                        src={entry.image}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-white font-medium">
                      {displayName}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-zinc-300">{entry.count}</span>
                  {entry.helpfulCount != null && entry.helpfulCount > 0 && (
                    <span className="text-zinc-500 text-xs ml-2">
                      ({entry.helpfulCount} helpful)
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function LeaderboardPage() {
  let topReviewers: LeaderboardEntry[] = [];
  let topRaters: LeaderboardEntry[] = [];
  let dataUnavailable = false;

  try {
    [topReviewers, topRaters] = await Promise.all([
      getTopReviewers(20),
      getTopTierRaters(20),
    ]);
  } catch {
    dataUnavailable = true;
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Community Leaderboard
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          The most active members of the Punchline Atlas community.
        </p>

        {dataUnavailable && (
          <div className="mb-6 p-4 rounded-card bg-amber-500/10 border border-amber-500/40 text-amber-200 text-center">
            Data temporarily unavailable. Please try again later.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              Top Reviewers
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              Members with the most show reviews.
            </p>
            {topReviewers.length > 0 ? (
              <LeaderboardTable entries={topReviewers} label="Reviews" />
            ) : (
              <p className="text-zinc-600 text-sm">No reviews yet.</p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              Top Tier Raters
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              Members who have rated the most comedians.
            </p>
            {topRaters.length > 0 ? (
              <LeaderboardTable entries={topRaters} label="Ratings" />
            ) : (
              <p className="text-zinc-600 text-sm">No ratings yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
