"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RevenueStats {
  totalTips: number;
  tipCount: number;
  ticketRevenue: number;
  ticketsSold: number;
  merchItemCount: number;
  confirmedBookings: number;
}

export default function CreatorRevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/creator/revenue");
        if (res.ok) setStats(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-zinc-400">Unable to load revenue data. Make sure you have an approved comedian profile.</p>
      </div>
    );
  }

  const totalRevenue = stats.totalTips + stats.ticketRevenue;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/creator" className="text-sm text-zinc-500 hover:text-zinc-300 mb-1 block">
        &larr; Creator Hub
      </Link>
      <h1 className="text-2xl font-bold text-brand-gold mb-6">Revenue Dashboard</h1>

      {/* Total revenue highlight */}
      <div className="p-6 rounded-lg bg-brand-surface border border-brand-gold/30 mb-6 text-center">
        <p className="text-zinc-400 text-sm uppercase tracking-wider">Total Revenue</p>
        <p className="text-4xl font-bold text-brand-gold mt-1">${totalRevenue.toFixed(2)}</p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Fan Tips" value={`$${stats.totalTips.toFixed(2)}`} sub={`${stats.tipCount} tips received`} />
        <StatCard label="Ticket Revenue" value={`$${stats.ticketRevenue.toFixed(2)}`} sub={`${stats.ticketsSold} tickets sold`} />
        <StatCard label="Confirmed Bookings" value={String(stats.confirmedBookings)} sub="Bookings accepted" />
        <StatCard label="Merch Items" value={String(stats.merchItemCount)} sub="Active listings" />
      </div>

      {/* Revenue breakdown chart placeholder */}
      <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
        <p className="text-zinc-500 text-sm">
          Detailed revenue charts and payout history coming soon.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
      <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white text-2xl font-bold mt-1">{value}</p>
      <p className="text-zinc-600 text-xs mt-1">{sub}</p>
    </div>
  );
}
