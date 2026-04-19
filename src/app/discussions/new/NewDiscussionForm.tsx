"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function NewDiscussionForm({
  initialEntityType,
  initialEntityId,
}: {
  initialEntityType?: string;
  initialEntityId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [entityType, setEntityType] = useState(initialEntityType ?? "comedian");
  const [entityId, setEntityId] = useState(initialEntityId ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId: entityId.trim(),
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Could not create discussion.");
        return;
      }

      toast("Discussion created.");
      router.push(`/discussions/${data.id}`);
      router.refresh();
    } catch {
      toast("Could not create discussion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-zinc-800 bg-brand-surface p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-zinc-300 mb-2">Thread topic</span>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            <option value="comedian">Comedian</option>
            <option value="venue">Venue</option>
            <option value="event">Event</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-zinc-300 mb-2">Entity ID</span>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            required
            placeholder={initialEntityId ? initialEntityId : "Paste a comedian, venue, or event id"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-zinc-300 mb-2">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          placeholder="What do you want to talk about?"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-zinc-300 mb-2">Prompt the conversation</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          placeholder="Share your take, ask a question, or start the debate."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Tip: event and venue pages usually deep-link here with the right ID prefilled.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create thread"}
        </button>
      </div>
    </form>
  );
}
