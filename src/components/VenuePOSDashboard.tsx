"use client";

import { useState, useEffect } from "react";

type POSSummary = {
  walkUpSales: {
    total: number;
    revenue: number;
    byMethod: Record<string, { count: number; revenue: number }>;
  };
  preOrders: {
    total: number;
    revenue: number;
    byStatus: Record<string, number>;
  };
  tickets: {
    sold: number;
    revenue: number;
  };
  totalRevenue: number;
  menuCategories: Record<string, { count: number; avgPrice: number }>;
};

function StatCard({
  label,
  value,
  subtext,
  accent = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800">
      <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-brand-gold" : "text-white"}`}>
        {value}
      </p>
      {subtext && <p className="text-zinc-600 text-xs mt-0.5">{subtext}</p>}
    </div>
  );
}

interface VenuePOSDashboardProps {
  venueId: string;
  eventId?: string;
}

export default function VenuePOSDashboard({ venueId, eventId }: VenuePOSDashboardProps) {
  const [data, setData] = useState<POSSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPOS() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ venueId });
        if (eventId) params.set("eventId", eventId);
        const res = await fetch(`/api/venue-ops/pos/summary?${params}`);
        if (!res.ok) throw new Error("Failed to load POS data");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load POS data");
      } finally {
        setLoading(false);
      }
    }
    fetchPOS();
  }, [venueId, eventId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
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

  if (!data) return null;

  const paymentMethods = Object.entries(data.walkUpSales.byMethod);
  const preOrderStatuses = Object.entries(data.preOrders.byStatus);
  const menuCats = Object.entries(data.menuCategories);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Revenue"
          value={`$${data.totalRevenue.toFixed(2)}`}
          accent
        />
        <StatCard
          label="Tickets Sold"
          value={String(data.tickets.sold)}
          subtext={`$${data.tickets.revenue.toFixed(2)} revenue`}
        />
        <StatCard
          label="Walk-Up Sales"
          value={String(data.walkUpSales.total)}
          subtext={`$${data.walkUpSales.revenue.toFixed(2)} revenue`}
        />
        <StatCard
          label="Pre-Orders"
          value={String(data.preOrders.total)}
          subtext={`$${data.preOrders.revenue.toFixed(2)} revenue`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue breakdown */}
        <div className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
          <h4 className="text-white font-medium text-sm mb-4">Revenue Sources</h4>
          <div className="space-y-3">
            {[
              { label: "Ticket Sales", value: data.tickets.revenue, color: "bg-brand-gold" },
              { label: "Walk-Up Sales", value: data.walkUpSales.revenue, color: "bg-green-500" },
              { label: "Pre-Orders", value: data.preOrders.revenue, color: "bg-blue-500" },
            ].map((source) => {
              const pct = data.totalRevenue > 0 ? (source.value / data.totalRevenue) * 100 : 0;
              return (
                <div key={source.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-sm ${source.color}`} />
                      <span className="text-zinc-300">{source.label}</span>
                    </div>
                    <span className="text-zinc-400">${source.value.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${source.color} rounded-full transition-all`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment methods */}
        <div className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
          <h4 className="text-white font-medium text-sm mb-4">Walk-Up Payment Methods</h4>
          {paymentMethods.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No walk-up sales data.</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(([method, info]) => (
                <div key={method} className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-800/50 last:border-0">
                  <span className="text-zinc-300 capitalize">{method}</span>
                  <div className="text-right">
                    <span className="text-white font-medium">${info.revenue.toFixed(2)}</span>
                    <span className="text-zinc-500 text-xs ml-2">({info.count} sales)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pre-order status */}
        <div className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
          <h4 className="text-white font-medium text-sm mb-4">Pre-Order Status</h4>
          {preOrderStatuses.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No pre-orders yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {preOrderStatuses.map(([status, count]) => {
                const statusColors: Record<string, string> = {
                  pending: "text-yellow-400",
                  confirmed: "text-blue-400",
                  preparing: "text-purple-400",
                  ready: "text-green-400",
                  delivered: "text-zinc-400",
                };
                return (
                  <div key={status} className="text-center">
                    <p className={`text-xl font-bold ${statusColors[status] ?? "text-white"}`}>
                      {count}
                    </p>
                    <p className="text-zinc-500 text-xs capitalize">{status}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Menu categories */}
        <div className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
          <h4 className="text-white font-medium text-sm mb-4">Menu Categories</h4>
          {menuCats.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No menu items configured.</p>
          ) : (
            <div className="space-y-2">
              {menuCats.map(([category, info]) => (
                <div key={category} className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-800/50 last:border-0">
                  <span className="text-zinc-300 capitalize">{category}</span>
                  <div className="text-right">
                    <span className="text-zinc-400">{info.count} items</span>
                    <span className="text-zinc-500 text-xs ml-2">avg ${info.avgPrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
