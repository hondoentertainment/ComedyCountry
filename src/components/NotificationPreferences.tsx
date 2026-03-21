"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "./Toast";

/**
 * Granular notification settings component.
 *
 * Allows users to control which notification types they receive,
 * how they receive them (in-app, push, email), and timing preferences.
 */
export function NotificationPreferences() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Server-backed preferences
  const [inApp, setInApp] = useState(true);
  const [emailDigest, setEmailDigest] = useState("off");
  const [eventReminder24h, setEventReminder24h] = useState(true);
  const [eventReminder1h, setEventReminder1h] = useState(true);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<string>("default");

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

    // Check push permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const save = useCallback(
    async (updates: {
      inApp?: boolean;
      emailDigest?: string;
      eventReminder24h?: boolean;
      eventReminder1h?: boolean;
    }) => {
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
    },
    [toast]
  );

  const handleEnablePush = async () => {
    if (!("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (vapidKey) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
          });

          const subJson = subscription.toJSON();
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subJson.endpoint,
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            }),
          });

          toast("Push notifications enabled");
        }
      }
    } catch (err) {
      console.error("[Push] Permission request failed:", err);
      toast("Failed to enable push notifications");
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
        <p className="text-zinc-500 text-sm">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery channels */}
      <section>
        <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">
          Delivery Channels
        </h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
            <div>
              <p className="text-zinc-300 font-medium">In-app notifications</p>
              <p className="text-zinc-500 text-sm">
                Show notifications in the app&apos;s notification center
              </p>
            </div>
            <ToggleSwitch
              checked={inApp}
              disabled={saving}
              onChange={(val) => {
                setInApp(val);
                save({ inApp: val });
              }}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
            <div>
              <p className="text-zinc-300 font-medium">Push notifications</p>
              <p className="text-zinc-500 text-sm">
                {pushPermission === "denied"
                  ? "Blocked in browser settings"
                  : "Receive alerts even when the app is closed"}
              </p>
            </div>
            {pushPermission === "granted" ? (
              <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Enabled
              </span>
            ) : pushPermission === "denied" ? (
              <span className="text-red-400 text-xs font-medium">Blocked</span>
            ) : (
              <button
                onClick={handleEnablePush}
                className="px-3 py-1.5 bg-brand-gold text-brand-dark text-xs font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors"
              >
                Enable
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
            <div>
              <p className="text-zinc-300 font-medium">Email digest</p>
              <p className="text-zinc-500 text-sm">
                Receive a summary of new events via email
              </p>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    emailDigest === option
                      ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
                  }`}
                >
                  {option === "off"
                    ? "Off"
                    : option === "daily"
                      ? "Daily"
                      : "Weekly"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Event reminders */}
      <section>
        <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">
          Event Reminders
        </h3>
        <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 space-y-3">
          <p className="text-zinc-500 text-sm mb-2">
            Get reminded before events you&apos;re attending
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-300 text-sm font-medium">
                24 hours before
              </p>
              <p className="text-zinc-500 text-xs">
                Day-before reminder for planning
              </p>
            </div>
            <ToggleSwitch
              checked={eventReminder24h}
              disabled={saving}
              onChange={(val) => {
                setEventReminder24h(val);
                save({ eventReminder24h: val });
              }}
            />
          </div>
          <div className="border-t border-zinc-800" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-300 text-sm font-medium">
                1 hour before
              </p>
              <p className="text-zinc-500 text-xs">
                Last-minute heads-up before showtime
              </p>
            </div>
            <ToggleSwitch
              checked={eventReminder1h}
              disabled={saving}
              onChange={(val) => {
                setEventReminder1h(val);
                save({ eventReminder1h: val });
              }}
            />
          </div>
        </div>
      </section>

      {/* Notification types info */}
      <section>
        <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">
          Notification Types
        </h3>
        <div className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
          <ul className="space-y-3 text-sm">
            <NotifTypeRow
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              label="New shows nearby"
              description="Based on your saved locations"
            />
            <NotifTypeRow
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              label="Comedian updates"
              description="New events from comedians you follow"
            />
            <NotifTypeRow
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              }
              label="Ticket confirmations"
              description="Purchase receipts and delivery"
            />
            <NotifTypeRow
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              label="Price drops"
              description="When tickets get cheaper for shows you like"
            />
          </ul>
        </div>
      </section>
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-50 ${
        checked ? "bg-brand-gold" : "bg-zinc-700"
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function NotifTypeRow({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="text-brand-gold mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-zinc-200 font-medium">{label}</p>
        <p className="text-zinc-500 text-xs">{description}</p>
      </div>
    </li>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
