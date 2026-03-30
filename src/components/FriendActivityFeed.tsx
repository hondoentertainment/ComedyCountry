"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

type Activity = {
  type: "review" | "follow";
  userId: string;
  userName: string;
  userImage: string | null;
  userUsername: string | null;
  description: string;
  link: string;
  rating?: number;
  createdAt: string;
};

export function FriendActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity-feed?limit=15")
      .then((r) => (r.ok ? r.json() : { activities: [] }))
      .then((data) => setActivities(data.activities ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-zinc-800/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        No recent activity from friends. Add more friends to see their activity
        here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((a, i) => (
        <Link
          key={`${a.userId}-${a.createdAt}-${i}`}
          href={a.link}
          className="flex items-start gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          {a.userImage ? (
            <Image
              src={a.userImage}
              alt=""
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs shrink-0">
              {a.userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-300">
              <span className="text-white font-medium">{a.userName}</span>{" "}
              {a.description}
              {a.rating != null && (
                <span className="text-brand-gold ml-1">
                  {"★".repeat(a.rating)}
                </span>
              )}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {new Date(a.createdAt).toLocaleDateString()}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
