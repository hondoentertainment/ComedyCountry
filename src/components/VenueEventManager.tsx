"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type EventComedian = {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
};

type VenueEvent = {
  id: string;
  title: string | null;
  date: string;
  showtime: string | null;
  showType: string;
  ticketUrl: string | null;
  comedians: Array<{
    role: string;
    comedian: EventComedian;
  }>;
};

type VenueAnalytics = {
  upcomingEvents: Array<{
    id: string;
    title: string | null;
    date: string;
    comedians: EventComedian[];
    ticketsSold: number;
    revenue: number;
  }>;
  pastEvents: Array<{
    id: string;
    title: string | null;
    date: string;
    comedians: EventComedian[];
    ticketsSold: number;
    revenue: number;
  }>;
  totalRevenue: number;
  staff: {
    totalStaff: number;
    recentShifts: number;
    byRole: Record<string, number>;
  };
  followers: {
    total: number;
    recent: number;
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
  };
};

interface VenueEventManagerProps {
  venueId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EventCard({
  event,
  showRevenue = false,
}: {
  event: VenueAnalytics["upcomingEvents"][0];
  showRevenue?: boolean;
}) {
  const isPast = new Date(event.date) < new Date();

  return (
    <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link
            href={`/events/${event.id}`}
            className="text-white font-medium hover:text-brand-gold transition-colors line-clamp-1"
          >
            {event.title || "Untitled Event"}
          </Link>
          <p className={`text-sm mt-0.5 ${isPast ? "text-zinc-500" : "text-zinc-400"}`}>
            {formatDate(event.date)}
          </p>
        </div>
        {showRevenue && (
          <div className="text-right ml-3">
            <p className="text-brand-gold font-semibold">${event.revenue.toFixed(2)}</p>
            <p className="text-zinc-500 text-xs">{event.ticketsSold} sold</p>
          </div>
        )}
      </div>

      {event.comedians.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {event.comedians.map((c) => (
            <Link
              key={c.id}
              href={`/comedians/${c.slug}`}
              className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded hover:bg-zinc-700 transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffSection({ staff }: { staff: VenueAnalytics["staff"] }) {
  const roles = Object.entries(staff.byRole);

  return (
    <div className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
      <h4 className="text-white font-medium text-sm mb-4">Staff Overview</h4>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{staff.totalStaff}</p>
          <p className="text-zinc-500 text-xs">Total Staff</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{staff.recentShifts}</p>
          <p className="text-zinc-500 text-xs">Recent Shifts</p>
        </div>
      </div>
      {roles.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-zinc-800">
          {roles.map(([role, count]) => (
            <div key={role} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400 capitalize">{role}</span>
              <span className="text-zinc-300">{count} shifts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VenueEventManager({ venueId }: VenueEventManagerProps) {
  const [analytics, setAnalytics] = useState<VenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "staff">("upcoming");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/venue-ops/analytics?venueId=${venueId}`);
        if (!res.ok) throw new Error("Failed to load venue analytics");
        setAnalytics(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [venueId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-brand-dark border border-zinc-800 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-16 mb-2" />
              <div className="h-7 bg-zinc-800 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-red-800/50 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Total Revenue</p>
          <p className="text-brand-gold text-2xl font-bold mt-1">
            ${analytics.totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Upcoming Shows</p>
          <p className="text-white text-2xl font-bold mt-1">
            {analytics.upcomingEvents.length}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Followers</p>
          <p className="text-white text-2xl font-bold mt-1">{analytics.followers.total}</p>
          {analytics.followers.recent > 0 && (
            <p className="text-green-400 text-xs mt-0.5">+{analytics.followers.recent} this month</p>
          )}
        </div>
        <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Avg Rating</p>
          <p className="text-white text-2xl font-bold mt-1">
            {analytics.reviews.averageRating > 0
              ? analytics.reviews.averageRating.toFixed(1)
              : "N/A"}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">{analytics.reviews.totalReviews} reviews</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-zinc-800">
        {(
          [
            { key: "upcoming", label: `Upcoming (${analytics.upcomingEvents.length})` },
            { key: "past", label: `Past Shows (${analytics.pastEvents.length})` },
            { key: "staff", label: "Staff" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-gold text-brand-gold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "upcoming" && (
        <div className="space-y-3">
          {analytics.upcomingEvents.length === 0 ? (
            <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
              <p className="text-zinc-400">No upcoming events scheduled.</p>
            </div>
          ) : (
            analytics.upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} showRevenue />
            ))
          )}
        </div>
      )}

      {activeTab === "past" && (
        <div className="space-y-3">
          {analytics.pastEvents.length === 0 ? (
            <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
              <p className="text-zinc-400">No past events found.</p>
            </div>
          ) : (
            analytics.pastEvents.map((event) => (
              <EventCard key={event.id} event={event} showRevenue />
            ))
          )}
        </div>
      )}

      {activeTab === "staff" && <StaffSection staff={analytics.staff} />}
    </div>
  );
}
