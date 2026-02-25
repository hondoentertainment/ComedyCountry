"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/Toast";

export function SettingsActions() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `punchline-atlas-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      toast("Your data has been exported.");
      setTimeout(() => setExportSuccess(false), 4000);
    } catch {
      setExportError("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      await signOut({ callbackUrl: "/" });
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Your Data
        </h2>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
            <h3 className="font-medium text-white mb-1">Export all data</h3>
            <p className="text-sm text-zinc-400 mb-3">
              Download a copy of your profile, followed comedians, saved venues,
              event reviews, and comedian tier ratings in JSON format (GDPR data portability).
            </p>
            {exportError && (
              <p className="text-sm text-red-400 mb-3" role="alert">
                {exportError}
              </p>
            )}
            {exportSuccess && (
              <p className="text-sm text-emerald-400 mb-3" role="status">
                Data exported successfully.
              </p>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white font-medium disabled:opacity-70 transition-colors"
            >
              {exporting ? "Exporting…" : "Export data"}
            </button>
          </div>

          <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-red-900/50">
            <h3 className="font-medium text-red-400 mb-1">Delete profile</h3>
            <p className="text-sm text-zinc-400 mb-3">
              Permanently delete your account and all associated data. This
              cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-400 mb-3" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="deleteConfirm" className="block text-sm text-zinc-400 mb-1">
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  id="deleteConfirm"
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== "DELETE"}
                className="px-4 py-2 rounded-md bg-red-900/80 text-red-200 hover:bg-red-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
