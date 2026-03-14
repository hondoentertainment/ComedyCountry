"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  eventId: string | null;
  venueId: string | null;
  comedianId: string | null;
  read: boolean;
  createdAt: string;
};

export function FeedContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filter === "unread") params.set("unread", "true");
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setTotalPages(data.pages);
      }
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => { setFilter("all"); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => { setFilter("unread"); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
            }`}
          >
            Unread{unreadCount > 0 && ` (${unreadCount})`}
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-brand-gold hover:underline font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 px-6 rounded-card bg-brand-surface border border-zinc-800 border-dashed text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-zinc-400 font-medium mb-2">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-zinc-500 text-sm mb-4 max-w-md mx-auto">
            When new events are added for comedians or venues you follow, you&apos;ll see them here.
          </p>
          <Link
            href="/comedians"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Browse comedians
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border transition-colors ${
                n.read
                  ? "bg-brand-surface/50 border-zinc-800/50"
                  : "bg-brand-surface border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 shrink-0">
                  {n.type === "new_event" ? (
                    <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${n.read ? "text-zinc-400" : "text-white"}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0" />
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-zinc-600 text-xs">{formatTime(n.createdAt)}</span>
                    {n.eventId && (
                      <Link
                        href={`/events/${n.eventId}`}
                        onClick={() => !n.read && markRead(n.id)}
                        className="text-xs text-brand-gold hover:underline font-medium"
                      >
                        View event
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 font-medium"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium disabled:opacity-50 hover:bg-zinc-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-zinc-500 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium disabled:opacity-50 hover:bg-zinc-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
