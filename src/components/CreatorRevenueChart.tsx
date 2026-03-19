"use client";

import { useState, useEffect } from "react";

type RevenuePeriod = {
  period: string;
  ticketRevenue: number;
  tipRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
};

const REVENUE_COLORS: Record<string, string> = {
  ticketRevenue: "bg-brand-gold",
  tipRevenue: "bg-green-500",
  merchRevenue: "bg-blue-500",
};

const REVENUE_LABELS: Record<string, string> = {
  ticketRevenue: "Tickets",
  tipRevenue: "Tips",
  merchRevenue: "Merch",
};

function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${year.slice(2)}`;
}

export default function CreatorRevenueChart() {
  const [data, setData] = useState<RevenuePeriod[]>([]);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRevenue() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/creator/analytics/revenue?months=${months}`);
        if (!res.ok) throw new Error("Failed to load revenue data");
        const json = await res.json();
        setData(json.revenue ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load revenue");
      } finally {
        setLoading(false);
      }
    }
    fetchRevenue();
  }, [months]);

  if (loading) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <div className="h-5 bg-zinc-800 rounded w-32 mb-4 animate-pulse" />
        <div className="h-48 bg-zinc-800/50 rounded animate-pulse" />
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

  const totalRevenue = data.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalTickets = data.reduce((sum, d) => sum + d.ticketRevenue, 0);
  const totalTips = data.reduce((sum, d) => sum + d.tipRevenue, 0);
  const totalMerch = data.reduce((sum, d) => sum + d.merchRevenue, 0);
  const maxRevenue = Math.max(1, ...data.map((d) => d.totalRevenue));

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Revenue Breakdown</h3>
        <div className="flex gap-1">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                months === m
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Total</p>
          <p className="text-brand-gold text-xl font-bold mt-0.5">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="p-3 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Tickets</p>
          <p className="text-white text-xl font-bold mt-0.5">{formatCurrency(totalTickets)}</p>
        </div>
        <div className="p-3 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Tips</p>
          <p className="text-white text-xl font-bold mt-0.5">{formatCurrency(totalTips)}</p>
        </div>
        <div className="p-3 rounded-lg bg-brand-dark border border-zinc-800">
          <p className="text-zinc-500 text-xs uppercase">Merch</p>
          <p className="text-white text-xl font-bold mt-0.5">{formatCurrency(totalMerch)}</p>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        {data.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No revenue data yet.</p>
        ) : (
          <>
            <div className="flex items-end gap-2 h-40">
              {data.map((period) => {
                const ticketHeight = maxRevenue > 0 ? (period.ticketRevenue / maxRevenue) * 100 : 0;
                const tipHeight = maxRevenue > 0 ? (period.tipRevenue / maxRevenue) * 100 : 0;
                const merchHeight = maxRevenue > 0 ? (period.merchRevenue / maxRevenue) * 100 : 0;

                return (
                  <div key={period.period} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                      style={{ height: `${Math.max(ticketHeight + tipHeight + merchHeight, 2)}%` }}
                      title={`${formatPeriodLabel(period.period)}: ${formatCurrency(period.totalRevenue)}`}
                    >
                      <div className="bg-brand-gold" style={{ height: `${ticketHeight}%` }} />
                      <div className="bg-green-500" style={{ height: `${tipHeight}%` }} />
                      <div className="bg-blue-500" style={{ height: `${merchHeight}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Labels */}
            <div className="flex gap-2 mt-2">
              {data.map((period) => (
                <div key={period.period} className="flex-1 text-center">
                  <p className="text-xs text-zinc-600 truncate">
                    {formatPeriodLabel(period.period)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-4 justify-center">
          {Object.entries(REVENUE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${REVENUE_COLORS[key]}`} />
              <span className="text-xs text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly detail table */}
      {data.length > 0 && (
        <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
          <h4 className="text-white font-medium text-sm mb-3">Monthly Details</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                  <th className="text-left py-2 pr-3">Period</th>
                  <th className="text-right py-2 px-3">Tickets</th>
                  <th className="text-right py-2 px-3">Tips</th>
                  <th className="text-right py-2 px-3">Merch</th>
                  <th className="text-right py-2 pl-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((period) => (
                  <tr key={period.period} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-3 text-white">{formatPeriodLabel(period.period)}</td>
                    <td className="text-right py-2 px-3 text-zinc-300">
                      {formatCurrency(period.ticketRevenue)}
                    </td>
                    <td className="text-right py-2 px-3 text-zinc-300">
                      {formatCurrency(period.tipRevenue)}
                    </td>
                    <td className="text-right py-2 px-3 text-zinc-300">
                      {formatCurrency(period.merchRevenue)}
                    </td>
                    <td className="text-right py-2 pl-3 text-brand-gold font-medium">
                      {formatCurrency(period.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
