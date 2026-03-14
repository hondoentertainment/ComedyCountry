"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

type ProfileFormProps = {
  userId: string;
  initialName: string;
};

export function ProfileForm({ userId, initialName }: ProfileFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName: name.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setSaved(true);
      toast("Profile updated.");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="profileName" className="block text-sm font-medium text-zinc-400">
        Profile name
      </label>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <input
          id="profileName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your display name"
          className="flex-1 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 disabled:opacity-70 transition-colors"
        >
          {saving ? "…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </form>
  );
}
