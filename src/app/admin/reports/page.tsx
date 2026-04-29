"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

interface Report {
  id: string;
  entityType: string;
  entityId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  actionTaken?: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?status=${filter}`)
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch((err: unknown) =>
        logger.error(
          "Admin reports fetch failed",
          "AdminReports fetch failed",
          {},
          err instanceof Error ? err : undefined,
        ),
      )
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleAction(
    reportId: string,
    status: string,
    action?: string,
  ) {
    const res = await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status, action }),
    });

    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-gold">
            Content Moderation
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Review reported content and take action.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin/operations"
            className="px-3 py-1 rounded border border-zinc-800 bg-brand-surface text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
          >
            Operations dashboard
          </Link>
          {["pending", "reviewed", "resolved", "dismissed", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-brand-surface border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-brand-surface animate-pulse"
            />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center rounded-lg bg-brand-surface border border-zinc-800">
          <p className="text-zinc-500">
            No {filter === "all" ? "" : filter} reports.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-lg bg-brand-surface border border-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        report.reason === "harassment"
                          ? "bg-red-900/30 text-red-400"
                          : report.reason === "spam"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {report.reason}
                    </span>
                    <span className="text-zinc-500 text-xs capitalize">
                      {report.entityType.replace("_", " ")}
                    </span>
                    <span className="text-zinc-700 text-xs">
                      {report.entityId}
                    </span>
                  </div>
                  {report.details && (
                    <p className="text-zinc-400 text-sm mt-2">
                      {report.details}
                    </p>
                  )}
                  <p className="text-zinc-600 text-xs mt-2">
                    Reported {new Date(report.createdAt).toLocaleDateString()}{" "}
                    by {report.reporterId}
                  </p>
                </div>

                {report.status === "pending" && (
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() =>
                        handleAction(report.id, "resolved", "content_removed")
                      }
                      className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleAction(report.id, "reviewed")}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleAction(report.id, "dismissed")}
                      className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 text-xs hover:bg-zinc-600"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
