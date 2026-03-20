"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

/**
 * Push notification permission request UI.
 *
 * Shows a friendly pre-prompt before requesting browser notification permission.
 * Handles subscription saving to the server after permission is granted.
 */
export function PushPermissionPrompt() {
  const { data: session } = useSession();
  const [permissionState, setPermissionState] =
    useState<PermissionState>("default");
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PermissionState);

    // Don't show if already granted/denied
    if (Notification.permission !== "default") return;

    // Don't show if not logged in
    if (!session?.user) return;

    // Check localStorage for previous dismissal
    const dismissedAt = localStorage.getItem("push-prompt-dismissed");
    if (dismissedAt) {
      const daysSince =
        (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) return;
    }

    // Show prompt after a delay so it doesn't feel aggressive
    const timer = setTimeout(() => setShowPrompt(true), 5000);
    return () => clearTimeout(timer);
  }, [session]);

  const handleEnable = useCallback(async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);

      if (permission === "granted") {
        // Subscribe to push and save to server
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
        }

        setShowPrompt(false);
      } else {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error("[Push] Subscription failed:", err);
    } finally {
      setSubscribing(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("push-prompt-dismissed", String(Date.now()));
  }, []);

  if (
    dismissed ||
    !showPrompt ||
    permissionState === "granted" ||
    permissionState === "denied" ||
    permissionState === "unsupported"
  ) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300 max-w-sm w-full">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-brand-gold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">
              Stay in the Loop
            </h3>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
              Get notified about new shows near you, event reminders, and updates
              from comedians you follow.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <NotifFeature text="Reminders before shows you're attending" />
          <NotifFeature text="New shows from comedians you follow" />
          <NotifFeature text="Price drops and ticket availability" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            disabled={subscribing}
            className="flex-1 px-4 py-2.5 bg-brand-gold text-brand-dark font-semibold rounded-lg text-sm hover:bg-brand-gold/90 transition-colors disabled:opacity-60"
          >
            {subscribing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                Enabling...
              </span>
            ) : (
              "Enable Notifications"
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        className="w-4 h-4 text-brand-gold shrink-0"
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
      <span className="text-zinc-300 text-xs">{text}</span>
    </div>
  );
}

/**
 * Convert a base64url-encoded VAPID public key to a Uint8Array for the Push API.
 */
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
