"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function NewFanClubForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/fan-clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          isPublic,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Could not create fan club.");
        return;
      }

      toast("Fan club created.");
      router.push(`/fan-clubs/${data.id}`);
      router.refresh();
    } catch {
      toast("Could not create fan club.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-zinc-800 bg-brand-surface p-6">
      <label className="block">
        <span className="block text-sm font-medium text-zinc-300 mb-2">Club name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          placeholder="Example: Friday Late Show Loyalists"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-zinc-300 mb-2">What is this club about?</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Tell fans what they will talk about, organize, or obsess over here."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        />
      </label>

      <div className="rounded-lg border border-zinc-800 bg-brand-charcoal/50 p-4">
        <p className="text-sm font-medium text-white mb-2">Visibility</p>
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-brand-gold focus:ring-brand-gold"
          />
          Public club. Let other fans discover and join it.
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          You will be added as the first admin automatically.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create club"}
        </button>
      </div>
    </form>
  );
}
