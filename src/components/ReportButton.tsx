"use client";

import { useState } from "react";

interface ReportButtonProps {
  entityType: string;
  entityId: string;
}

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

export default function ReportButton({ entityType, entityId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit() {
    if (!reason) return;
    setStatus("submitting");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, reason, details }),
      });

      if (res.ok) {
        setStatus("done");
        setTimeout(() => {
          setOpen(false);
          setStatus("idle");
          setReason("");
          setDetails("");
        }, 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
        title="Report"
      >
        Report
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-lg bg-brand-surface border border-zinc-800">
      {status === "done" ? (
        <p className="text-green-400 text-sm">Report submitted. Thank you.</p>
      ) : (
        <>
          <p className="text-zinc-300 text-sm font-medium mb-2">Report this content</p>
          <div className="space-y-2">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded bg-brand-charcoal border border-zinc-700 text-zinc-300 text-sm px-3 py-1.5"
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={2}
              className="w-full rounded bg-brand-charcoal border border-zinc-700 text-zinc-300 text-sm px-3 py-1.5 resize-none"
              maxLength={500}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!reason || status === "submitting"}
                className="px-3 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {status === "submitting" ? "Submitting..." : "Submit Report"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setReason("");
                  setDetails("");
                }}
                className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
            {status === "error" && (
              <p className="text-red-400 text-xs">Failed to submit report. Please try again.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
