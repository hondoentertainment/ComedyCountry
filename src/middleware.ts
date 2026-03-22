import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const PROTECTED_PATTERNS = [
  /^\/api\/bookings/,
  /^\/api\/messages/,
  /^\/api\/streaming\/(connect|sync)/,
  /^\/api\/checkout\/embed/,
  /^\/api\/email-purchase/,
  /^\/api\/venue-ops/,
  /^\/api\/analytics\/dashboard/,
  /^\/api\/developer\/(keys|webhooks)/,
  /^\/api\/creator/,
  /^\/api\/fair-ticketing\/waitlist/,
  /^\/comedian-dashboard/,
  /^\/venue-dashboard/,
];

// Routes that are always public
const PUBLIC_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/search/,
  /^\/api\/comedians/,
  /^\/api\/events/,
  /^\/api\/venues/,
  /^\/api\/pricing\/social/,
  /^\/api\/health/,
  /^\/_next/,
  /^\/favicon/,
];

function isProtected(pathname: string): boolean {
  if (PUBLIC_PATTERNS.some((p) => p.test(pathname))) return false;
  return PROTECTED_PATTERNS.some((p) => p.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Request ID tracing ───────────────────────────────────────────
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);

  // ─── Security headers ──────────────────────────────────────────────
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Generate a nonce for inline scripts
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://maps.googleapis.com https://*.gstatic.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://maps.googleapis.com",
    "frame-src 'self' https://maps.googleapis.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);

  // ─── Security headers for API responses ─────────────────────────────
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Cache-Control", "no-store");

    // CORS for embeddable checkout
    if (pathname.startsWith("/api/checkout/embed")) {
      const origin = request.headers.get("origin") ?? "*";
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.headers.set("Access-Control-Max-Age", "86400");

      if (request.method === "OPTIONS") {
        return new NextResponse(null, { status: 204, headers: response.headers });
      }
    }
  }

  // ─── Auth check for protected routes ────────────────────────────────
  if (isProtected(pathname)) {
    const token = await getToken({ req: request });

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Authentication required", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
      // Redirect non-API routes to sign in
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
