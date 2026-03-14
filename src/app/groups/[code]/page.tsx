"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface GroupData {
  group: {
    id: string;
    code: string;
    name: string | null;
    createdAt: string;
    creator: { profileName: string | null; name: string | null; image: string | null };
    members: Array<{
      id: string;
      status: string;
      user: { id: string; profileName: string | null; name: string | null; image: string | null };
    }>;
  };
  event: {
    id: string;
    date: string;
    showtime: string | null;
    title: string | null;
    venue: { name: string; city: string; state: string };
    comedians: Array<{ comedian: { name: string; slug: string } }>;
  } | null;
}

export default function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const { data: session } = useSession();
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${code}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  async function joinGroup(status: string) {
    if (!session) return;
    setJoining(true);
    try {
      await fetch(`/api/groups/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchGroup();
    } catch {
      // ignore
    } finally {
      setJoining(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/2" />
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
          <div className="h-32 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Group Not Found</h1>
        <p className="text-zinc-500">This group code doesn&apos;t exist or has been deleted.</p>
      </div>
    );
  }

  const { group, event } = data;
  const myMembership = session?.user?.id
    ? group.members.find((m) => m.user.id === session.user.id)
    : null;
  const goingMembers = group.members.filter((m) => m.status === "going");
  const maybeMembers = group.members.filter((m) => m.status === "maybe");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-gold mb-1">
          {group.name || "Show Group"}
        </h1>
        <p className="text-zinc-400 text-sm">
          Created by {group.creator.profileName || group.creator.name || "Someone"} &middot; Code: <code className="text-brand-gold">{group.code}</code>
        </p>
      </div>

      {/* Event Info */}
      {event && (
        <Link
          href={`/events/${event.id}`}
          className="block p-5 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors mb-8"
        >
          <p className="text-brand-gold text-xs font-bold uppercase mb-1">
            {new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {event.showtime && ` at ${event.showtime}`}
          </p>
          <p className="text-white font-bold text-lg">
            {event.title || event.comedians.map((ec) => ec.comedian.name).join(", ")}
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            {event.venue.name} &middot; {event.venue.city}, {event.venue.state}
          </p>
        </Link>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {session ? (
          <>
            <button
              onClick={() => joinGroup("going")}
              disabled={joining}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                myMembership?.status === "going"
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-brand-surface border border-zinc-700 text-zinc-300 hover:border-brand-gold hover:text-brand-gold"
              }`}
            >
              {myMembership?.status === "going" ? "Going!" : "I'm going"}
            </button>
            <button
              onClick={() => joinGroup("maybe")}
              disabled={joining}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                myMembership?.status === "maybe"
                  ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
                  : "bg-brand-surface border border-zinc-700 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              Maybe
            </button>
          </>
        ) : (
          <Link href="/auth/signin" className="px-5 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold">
            Sign in to join
          </Link>
        )}
        <button
          onClick={copyLink}
          className="px-5 py-2 rounded-lg bg-brand-surface border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-600 transition-colors"
        >
          {copied ? "Copied!" : "Share link"}
        </button>
      </div>

      {/* Members */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">
          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
        </h2>

        {goingMembers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-brand-gold mb-2">Going ({goingMembers.length})</h3>
            <div className="flex flex-wrap gap-3">
              {goingMembers.map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {maybeMembers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Maybe ({maybeMembers.length})</h3>
            <div className="flex flex-wrap gap-3">
              {maybeMembers.map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MemberChip({ member }: { member: { user: { profileName: string | null; name: string | null; image: string | null } } }) {
  const name = member.user.profileName || member.user.name || "Anonymous";
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-surface border border-zinc-800">
      {member.user.image ? (
        <Image src={member.user.image} alt={name} width={24} height={24} className="rounded-full" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-brand-charcoal flex items-center justify-center text-zinc-600 text-xs">
          {name.charAt(0)}
        </div>
      )}
      <span className="text-zinc-300 text-sm">{name}</span>
    </div>
  );
}
