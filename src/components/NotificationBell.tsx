"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function NotificationBell() {
  const { data: session } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count);
        }
      } catch {
        // Silently fail
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [session]);

  if (!session?.user) return null;

  return (
    <Link
      href="/feed"
      className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-150"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-brand-gold text-brand-dark text-[10px] font-bold leading-none px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
