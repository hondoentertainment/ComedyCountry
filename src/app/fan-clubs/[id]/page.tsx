import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { JoinLeaveButton } from "./JoinLeaveButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await prisma.fanClub.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: club
      ? `${club.name} | Fan Clubs | Punchline Atlas`
      : "Fan Club | Punchline Atlas",
  };
}

export default async function FanClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const club = await prisma.fanClub.findUnique({
    where: { id },
    include: {
      members: { orderBy: { createdAt: "asc" }, take: 50 },
      _count: { select: { members: true } },
    },
  });

  if (!club) notFound();

  const isMember = session?.user?.id
    ? club.members.some((m) => m.userId === session.user!.id)
    : false;
  const isCreator = club.creatorId === session?.user?.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/fan-clubs"
        className="text-zinc-500 hover:text-zinc-300 text-sm mb-4 inline-block"
      >
        &larr; Back to fan clubs
      </Link>

      <div className="bg-brand-surface border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
            {club.description && (
              <p className="text-zinc-400 mt-2">{club.description}</p>
            )}
            <p className="text-zinc-600 text-sm mt-2">
              {club._count.members} member
              {club._count.members !== 1 ? "s" : ""} &middot;{" "}
              {club.isPublic ? "Public" : "Private"} club
            </p>
          </div>
          {session && !isCreator && (
            <JoinLeaveButton clubId={club.id} initialMember={isMember} />
          )}
          {isCreator && (
            <span className="px-3 py-1.5 rounded-md bg-brand-gold/20 text-brand-gold text-sm font-medium">
              Creator
            </span>
          )}
        </div>
      </div>

      {/* Members */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Members</h2>
        {club.members.length > 0 ? (
          <div className="space-y-2">
            {club.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-brand-surface border border-zinc-800 rounded-lg"
              >
                <span className="text-zinc-300 text-sm">
                  {member.userId}
                </span>
                <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">No members yet.</p>
        )}
      </section>
    </div>
  );
}
