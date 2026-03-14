"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminDeleteButton({ endpoint, itemName }: { endpoint: string; itemName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${itemName}"? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="px-3 py-1 rounded-md bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
    >
      {deleting ? "..." : "Delete"}
    </button>
  );
}
