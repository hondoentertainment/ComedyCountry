import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "dev",

    integrations: [
      Sentry.replayIntegration({
        // Mask all user input in replays for privacy
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
      Sentry.browserTracingIntegration(),
    ],

    // Filter out noisy client-side errors
    ignoreErrors: [
      // Browser extensions and third-party scripts
      "ResizeObserver loop",
      "Non-Error promise rejection",
      // Network issues outside our control
      "Failed to fetch",
      "Load failed",
      "NetworkError",
      "AbortError",
      // Next.js navigation
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
    ],

    // Don't send errors from browser extensions or third-party scripts
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}
