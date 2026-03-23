import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",

    // Filter out noisy or low-value errors
    ignoreErrors: [
      // Network errors from client disconnects
      "ECONNRESET",
      "ECONNABORTED",
      "EPIPE",
      // Next.js internal navigation
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
    ],

    beforeSend(event) {
      // Strip sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.category === "http" && bc.data?.url) {
            try {
              const url = new URL(bc.data.url as string);
              url.searchParams.delete("token");
              url.searchParams.delete("key");
              url.searchParams.delete("secret");
              bc.data.url = url.toString();
            } catch {
              // leave as-is if URL parsing fails
            }
          }
          return bc;
        });
      }
      return event;
    },
  });
}
