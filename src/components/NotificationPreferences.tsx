"use client";

import { useState, useEffect } from "react";
import { useToast } from "./Toast";

export function NotificationPreferences() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inApp, setInApp] = useState(true);
  const [emailDigest, setEmailDigest] = useState("off");
  const [eventReminder24h, setEventReminder24h] = useState(true);
  const [eventReminder1h, setEventReminder1h] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) {
          const data = await res.json();
          setInApp(data.inApp);
          setEmailDigest(data.emailDigest);
          setEventReminder24h(data.eventReminder24h ?? true);
          setEventReminder1h(data.eventReminder1h ?? true);
        }
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save(updates: { inApp?: boolean; emailDigest?: string; eventReminder24h?: boolean; eventReminder1h?: boolean }) {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setInApp(data.inApp);
        setEmailDigest(data.emailDigest);
        setEventReminder24h(data.eventReminder24h ?? true);
        setEventReminder1h(data.eventReminder1h ?? true);
        toast("Preferences saved");
      }
    } catch {
      toast("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
        <p className="text-zinc-500 text-sm">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
        <div>
          <p className="text-zinc-300 font-medium">In-app notifications</p>
          <p className="text-zinc-500 text-sm">Get notified about new events from followed comedians and venues</p>
        </div>
        <button
          onClick={() => {
            const newVal = !inApp;
            setInApp(newVal);
            save({ inApp: newVal });
          }}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            inApp ? "bg-brand-gold" : "bg-zinc-700"
          }`}
          role="switch"
          aria-checked={inApp}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              inApp ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
        <div className="mb-3">
          <p className="text-zinc-300 font-medium">Event reminders</p>
          <p className="text-zinc-500 text-sm">Email me before events I&apos;m attending</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              onClick={() => {
                const newVal = !eventReminder24h;
                setEventReminder24h(newVal);
                save({ eventReminder24h: newVal });
              }}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                eventReminder24h ? "bg-brand-gold" : "bg-zinc-700"
              }`}
              role="switch"
              aria-checked={eventReminder24h}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  eventReminder24h ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-zinc-300 text-sm">24 hours before</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              onClick={() => {
                const newVal = !eventReminder1h;
                setEventReminder1h(newVal);
                save({ eventReminder1h: newVal });
              }}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                eventReminder1h ? "bg-brand-gold" : "bg-zinc-700"
              }`}
              role="switch"
              aria-checked={eventReminder1h}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  eventReminder1h ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-zinc-300 text-sm">1 hour before</span>
          </label>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
        <div className="mb-3">
          <p className="text-zinc-300 font-medium">Email digest</p>
          <p className="text-zinc-500 text-sm">Receive a summary of new events via email</p>
        </div>
        <div className="flex gap-2">
          {(["off", "daily", "weekly"] as const).map((option) => (
            <button
              key={option}
              onClick={() => {
                setEmailDigest(option);
                save({ emailDigest: option });
              }}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                emailDigest === option
                  ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
              }`}
            >
              {option === "off" ? "Off" : option === "daily" ? "Daily" : "Weekly"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
