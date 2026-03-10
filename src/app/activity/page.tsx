"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface ActivityItem {
  id: string;
  actor: { id: string; name: string | null; profileName: string | null; image: string | null; username: string | null } | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string | number> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  rated_comedian: "rated",
  reviewed_event: "reviewed",
  followed_comedian: "started following",
  followed_user: "started following",
  attended_event: "is going to",
  created_list: "created a list",
  rated_special: "rated a special",
};

function getEntityLink(entityType: string, entityId: string, metadata: Record<string, string | number> | null): string {
  switch (entityType) {
    case "comedian": return `/comedians/${metadata?.slug || entityId}`;
    case "event": return `/events/${entityId}`;
    case "venue": return `/venues/${entityId}`;
    case "list": return `/lists/${entityId}`;
    case "user": return `/u/${metadata?.username || entityId}`;
    default: return "#";
  }
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const url = `/api/activity${cursor ? `?cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Activity</h1>
        <p className="text-zinc-400 mb-8">See what people you follow are up to.</p>

        {items.length === 0 && !loading && (
          <div className="text-center p-8 rounded-lg bg-brand-surface border border-zinc-800">
            <p className="text-zinc-400">No activity yet. Follow other users to see their updates here.</p>
          </div>
        )}

        <div className="space-y-1">
          {items.map((item) => {
            const displayName = item.actor?.profileName || item.actor?.name || "Someone";
            const entityName = (item.metadata?.name as string) || (item.metadata?.title as string) || item.entityType;
            const link = getEntityLink(item.entityType, item.entityId, item.metadata);
            const timeAgo = getTimeAgo(item.createdAt);

            return (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-brand-surface/50 transition-colors">
                {item.actor?.image ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative">
                    <Image src={item.actor.image} alt="" fill className="object-cover" sizes="36px" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-zinc-500 text-sm font-bold">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300">
                    <Link href={item.actor?.username ? `/u/${item.actor.username}` : "#"} className="font-medium text-white hover:text-brand-gold">
                      {displayName}
                    </Link>{" "}
                    {ACTION_LABELS[item.action] || item.action}{" "}
                    <Link href={link} className="text-brand-gold hover:underline">
                      {entityName}
                    </Link>
                    {item.metadata?.tier && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded bg-brand-gold/20 text-brand-gold">
                        {item.metadata.tier as string}
                      </span>
                    )}
                    {item.metadata?.rating && (
                      <span className="ml-1 text-brand-gold">{"★".repeat(item.metadata.rating as number)}</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">{timeAgo}</p>
                </div>
              </div>
            );
          })}
        </div>

        {nextCursor && (
          <button
            onClick={() => load(nextCursor)}
            disabled={loading}
            className="mt-6 w-full py-2.5 rounded-lg bg-brand-surface border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-sm"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        )}

        {loading && items.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-zinc-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
