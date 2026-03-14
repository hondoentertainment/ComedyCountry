import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReplyForm } from "./ReplyForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await prisma.discussionThread.findUnique({
    where: { id },
    select: { title: true },
  });
  return {
    title: thread
      ? `${thread.title} | Punchline Atlas`
      : "Discussion | Punchline Atlas",
  };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const thread = await prisma.discussionThread.findUnique({
    where: { id },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
      _count: { select: { replies: true } },
    },
  });

  if (!thread) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/discussions"
        className="text-zinc-500 hover:text-zinc-300 text-sm mb-4 inline-block"
      >
        &larr; Back to discussions
      </Link>

      {/* Thread Header */}
      <div className="bg-brand-surface border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          {thread.isPinned && (
            <span className="text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded font-medium">
              PINNED
            </span>
          )}
          {thread.isLocked && (
            <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded font-medium">
              LOCKED
            </span>
          )}
          <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">
            {thread.entityType}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{thread.title}</h1>
        <div className="text-zinc-300 whitespace-pre-wrap">{thread.body}</div>
        <div className="flex items-center gap-3 mt-4 text-xs text-zinc-600">
          <span>{new Date(thread.createdAt).toLocaleString()}</span>
          <span>{thread._count.replies} replies</span>
        </div>
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-white">Replies</h2>
          {thread.replies.map((reply) => (
            <div
              key={reply.id}
              className="bg-brand-surface border border-zinc-800 rounded-lg p-4"
            >
              <p className="text-zinc-300 whitespace-pre-wrap">{reply.body}</p>
              <div className="text-xs text-zinc-600 mt-2">
                {new Date(reply.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Form */}
      {session && !thread.isLocked ? (
        <ReplyForm threadId={thread.id} />
      ) : !session ? (
        <p className="text-zinc-500 text-sm">
          <Link href="/auth/signin" className="text-brand-gold hover:underline">
            Sign in
          </Link>{" "}
          to reply.
        </p>
      ) : (
        <p className="text-zinc-500 text-sm">This thread is locked.</p>
      )}
    </div>
  );
}
