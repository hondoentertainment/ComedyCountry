/**
 * Native feature detection and Capacitor bridges.
 *
 * Provides a unified API for detecting the runtime platform (web, iOS, Android)
 * and accessing native capabilities when running inside a Capacitor shell.
 * Gracefully degrades on web by returning safe defaults.
 */

import { logger } from "@/lib/logger";

export type NativePlatform = "ios" | "android" | "web";

/**
 * Detect the current runtime platform.
 */
export function getPlatform(): NativePlatform {
  if (typeof window === "undefined") return "web";

  const win = window as unknown as Record<string, unknown>;

  // Capacitor injects a global object
  if (win.Capacitor && typeof win.Capacitor === "object") {
    const cap = win.Capacitor as { getPlatform?: () => string };
    if (typeof cap.getPlatform === "function") {
      const plat = cap.getPlatform();
      if (plat === "ios") return "ios";
      if (plat === "android") return "android";
    }
  }

  // Fallback user-agent heuristics (non-Capacitor webview)
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";

  return "web";
}

/**
 * Check if running inside a native Capacitor shell (not a plain browser).
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as Record<string, unknown>;
  if (!win.Capacitor || typeof win.Capacitor !== "object") return false;
  const cap = win.Capacitor as { isNativePlatform?: () => boolean };
  return typeof cap.isNativePlatform === "function"
    ? cap.isNativePlatform()
    : false;
}

/**
 * Check if the device supports PWA install prompt (non-iOS browsers).
 */
export function supportsPWAInstall(): boolean {
  if (typeof window === "undefined") return false;
  // On iOS, must use "Add to Home Screen" from Safari share menu
  if (getPlatform() === "ios") return false;
  // Check for the beforeinstallprompt event support
  return (
    "BeforeInstallPromptEvent" in window || "onbeforeinstallprompt" in window
  );
}

/**
 * Check if the app is running as an installed PWA (standalone display).
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as Record<string, unknown>).standalone === true
  );
}

/**
 * Safely call a Capacitor plugin method.
 * Returns null if the plugin or method is not available.
 */
export async function callNativePlugin<T>(
  pluginName: string,
  methodName: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  if (typeof window === "undefined") return null;

  const win = window as unknown as Record<string, unknown>;
  const cap = win.Capacitor as Record<string, unknown> | undefined;
  if (!cap) return null;

  const plugins = cap.Plugins as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!plugins) return null;

  const plugin = plugins[pluginName];
  if (!plugin || typeof plugin[methodName] !== "function") return null;

  try {
    const method = plugin[methodName] as (
      args?: Record<string, unknown>,
    ) => Promise<T>;
    return await method(args);
  } catch (err) {
    logger.warn(`Native ${pluginName}.${methodName} failed`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Configure status bar appearance for native apps.
 */
export async function configureStatusBar(options?: {
  style?: "dark" | "light";
  backgroundColor?: string;
}): Promise<void> {
  if (!isNativeApp()) return;
  const style = options?.style ?? "dark";
  const backgroundColor = options?.backgroundColor ?? "#0d0d0d";

  await callNativePlugin("StatusBar", "setStyle", {
    style: style === "dark" ? "DARK" : "LIGHT",
  });
  await callNativePlugin("StatusBar", "setBackgroundColor", {
    color: backgroundColor,
  });
}

/**
 * Hide the splash screen (call after app is ready).
 */
export async function hideSplashScreen(): Promise<void> {
  if (!isNativeApp()) return;
  await callNativePlugin("SplashScreen", "hide", { fadeOutDuration: 300 });
}

/**
 * Open a URL using the system browser (not in-app webview).
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isNativeApp()) {
    const result = await callNativePlugin("Browser", "open", {
      url,
      windowName: "_system",
    });
    if (result !== null) return;
  }
  // Fallback: standard window.open
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Share content using the native share sheet.
 * Falls back to Web Share API or clipboard.
 */
export async function nativeShare(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  // Try Capacitor Share plugin first
  if (isNativeApp()) {
    const result = await callNativePlugin("Share", "share", {
      title: data.title,
      text: data.text,
      url: data.url,
      dialogTitle: data.title ?? "Share",
    });
    if (result !== null) return true;
  }

  // Fallback: Web Share API
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch {
      // User cancelled or API error
    }
  }

  // Final fallback: copy URL to clipboard
  if (data.url && typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(data.url);
      return true;
    } catch {
      // Clipboard API not available
    }
  }

  return false;
}

/**
 * Request haptic feedback on native platforms.
 */
export async function hapticFeedback(
  style: "light" | "medium" | "heavy" = "medium",
): Promise<void> {
  if (!isNativeApp()) return;
  await callNativePlugin("Haptics", "impact", { style });
}

/**
 * Get the safe area insets for notch/home indicator.
 * Returns zeros on web.
 */
export function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof document === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue("--safe-area-inset-top") || "0", 10),
    bottom: parseInt(
      style.getPropertyValue("--safe-area-inset-bottom") || "0",
      10,
    ),
    left: parseInt(style.getPropertyValue("--safe-area-inset-left") || "0", 10),
    right: parseInt(
      style.getPropertyValue("--safe-area-inset-right") || "0",
      10,
    ),
  };
}

/**
 * Register deep link handler for Capacitor.
 * Returns an unsubscribe function, or null if not in native context.
 */
export function registerDeepLinkHandler(
  handler: (url: string) => void,
): (() => void) | null {
  if (!isNativeApp()) return null;

  const win = window as unknown as Record<string, unknown>;
  const cap = win.Capacitor as Record<string, unknown> | undefined;
  if (!cap) return null;

  const plugins = cap.Plugins as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!plugins) return null;

  const appPlugin = plugins.App;
  if (!appPlugin || typeof appPlugin.addListener !== "function") return null;

  try {
    const listener = (appPlugin.addListener as Function)(
      "appUrlOpen",
      (data: { url?: string }) => {
        if (data.url) {
          // Convert deep link URLs to relative paths
          const url = new URL(data.url);
          handler(url.pathname + url.search + url.hash);
        }
      },
    );

    return () => {
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      }
    };
  } catch {
    return null;
  }
}
