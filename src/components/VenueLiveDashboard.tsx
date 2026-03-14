"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Real-Time Venue Dashboard Component
 * Connects to SSE endpoint for live updates on capacity, sales, check-ins, revenue.
 */

interface VenueDashboardSnapshot {
  timestamp: string;
  eventId: string;
  capacity: { current: number; max: number; percentFull: number };
  tickets: {
    totalSold: number;
    totalCapacity: number;
    percentSold: number;
    recentSales: number;
    salesVelocity: number;
  };
  walkUps: {
    total: number;
    totalRevenue: number;
    cash: number;
    card: number;
    comp: number;
  };
  checkIns: {
    checkedIn: number;
    totalTickets: number;
    percentCheckedIn: number;
  };
  revenue: {
    ticketRevenue: number;
    walkUpRevenue: number;
    preOrderRevenue: number;
    totalRevenue: number;
  };
  waitlist: { waiting: number; offered: number; claimed: number };
  staff: Array<{ name: string; role: string; status: string }>;
}

interface VenueLiveDashboardProps {
  venueId: string;
  eventId: string;
  eventTitle?: string;
  refreshInterval?: number;
}

function ProgressBar({
  value,
  max,
  color = "bg-emerald-500",
  label,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span>
            {value}/{max} ({pct}%)
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  color = "text-gray-900",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}

export default function VenueLiveDashboard({
  venueId,
  eventId,
  eventTitle,
  refreshInterval = 5000,
}: VenueLiveDashboardProps) {
  const [data, setData] = useState<VenueDashboardSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const url = `/api/venue-ops/live-dashboard?venueId=${venueId}&eventId=${eventId}&interval=${refreshInterval}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data);
        if (snapshot.error) {
          setError(snapshot.error);
        } else {
          setData(snapshot);
          setError(null);
        }
        setConnected(true);
      } catch {
        setError("Failed to parse data");
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    eventSourceRef.current = es;
  }, [venueId, eventId, refreshInterval]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {error ?? "Connecting to live dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  const capacityColor =
    data.capacity.percentFull >= 90
      ? "bg-red-500"
      : data.capacity.percentFull >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {eventTitle ?? "Live Dashboard"}
          </h2>
          <p className="text-sm text-gray-500">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Live" : "Reconnecting..."}
          </span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`$${data.revenue.totalRevenue.toLocaleString()}`}
          color="text-emerald-600"
        />
        <StatCard
          label="Tickets Sold"
          value={data.tickets.totalSold}
          subtext={`of ${data.tickets.totalCapacity} (${data.tickets.percentSold}%)`}
        />
        <StatCard
          label="Checked In"
          value={data.checkIns.checkedIn}
          subtext={`${data.checkIns.percentCheckedIn}% of ticket holders`}
        />
        <StatCard
          label="Sales Velocity"
          value={`${data.tickets.salesVelocity}/hr`}
          subtext={`${data.tickets.recentSales} in last 30 min`}
          color="text-blue-600"
        />
      </div>

      {/* Capacity & Check-in progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Venue Capacity</h3>
          <ProgressBar
            value={data.capacity.current}
            max={data.capacity.max}
            color={capacityColor}
            label="Current capacity"
          />
          <div className="mt-3">
            <ProgressBar
              value={data.checkIns.checkedIn}
              max={data.checkIns.totalTickets}
              color="bg-blue-500"
              label="Check-in progress"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Revenue Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ticket sales</span>
              <span className="font-medium">${data.revenue.ticketRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Walk-up sales</span>
              <span className="font-medium">${data.revenue.walkUpRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pre-orders</span>
              <span className="font-medium">${data.revenue.preOrderRevenue.toFixed(2)}</span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-emerald-600">${data.revenue.totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Walk-ups & Waitlist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Walk-Up Sales</h3>
          <div className="text-2xl font-bold text-gray-900 mb-2">{data.walkUps.total}</div>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Cash</span>
              <span>{data.walkUps.cash}</span>
            </div>
            <div className="flex justify-between">
              <span>Card</span>
              <span>{data.walkUps.card}</span>
            </div>
            <div className="flex justify-between">
              <span>Comp</span>
              <span>{data.walkUps.comp}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Waitlist Queue</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Waiting</span>
              <span className="font-medium text-amber-600">{data.waitlist.waiting}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Offered</span>
              <span className="font-medium text-blue-600">{data.waitlist.offered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Claimed</span>
              <span className="font-medium text-emerald-600">{data.waitlist.claimed}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Staff On Duty</h3>
          {data.staff.length === 0 ? (
            <p className="text-sm text-gray-400">No staff on shift</p>
          ) : (
            <div className="space-y-1.5">
              {data.staff.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-gray-400 capitalize">{s.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket sales progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Ticket Sales</h3>
        <ProgressBar
          value={data.tickets.totalSold}
          max={data.tickets.totalCapacity}
          color={data.tickets.percentSold >= 90 ? "bg-emerald-500" : "bg-blue-500"}
          label="Tickets sold"
        />
      </div>
    </div>
  );
}
