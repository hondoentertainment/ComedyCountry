"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface FriendInfo {
  id: string;
  name: string | null;
  profileName: string | null;
  image: string | null;
}

interface FriendsGoingBadgeProps {
  eventId: string;
}

export function FriendsGoingBadge({ eventId }: FriendsGoingBadgeProps) {
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/friends-going/${eventId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.friends) {
          setFriends(data.friends);
          setCount(data.count);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading || count === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={friends
        .map((f) => f.profileName || f.name || "Friend")
        .join(", ")}
    >
      <span className="flex -space-x-1.5">
        {friends.slice(0, 3).map((f) =>
          f.image ? (
            <Image
              key={f.id}
              src={f.image}
              alt=""
              width={20}
              height={20}
              className="w-5 h-5 rounded-full border border-brand-surface object-cover"
            />
          ) : (
            <span
              key={f.id}
              className="w-5 h-5 rounded-full border border-brand-surface bg-zinc-700 flex items-center justify-center text-[9px] text-zinc-400 font-bold"
            >
              {(f.profileName || f.name || "?")[0]?.toUpperCase()}
            </span>
          )
        )}
      </span>
      <span className="text-xs text-brand-gold font-medium">
        {count} friend{count !== 1 ? "s" : ""} going
      </span>
    </span>
  );
}
