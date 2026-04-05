# CORS Policy Documentation

**Last Updated:** April 4, 2026

---

## Embed Endpoints — Wildcard CORS (Intentional)

The following endpoints use `Access-Control-Allow-Origin: *` **by design**:

| Endpoint                   | Purpose                                             | CORS                           |
| -------------------------- | --------------------------------------------------- | ------------------------------ |
| `GET /api/embed`           | Embeddable widget data (comedian/venue/event cards) | `*`                            |
| `POST /api/checkout/embed` | White-label ticket checkout for venue websites      | Origin-based with `*` fallback |

### Why Wildcard CORS?

These endpoints power **embeddable widgets** designed to be loaded on third-party websites (venue sites, promoter pages, etc.). Restricting CORS to specific origins would break the core use case — any venue should be able to embed a Punchline Atlas widget without requesting allowlisting.

### Security Mitigations

Even with `Access-Control-Allow-Origin: *`, these endpoints are protected by:

1. **Rate Limiting:** Both endpoints enforce per-IP rate limits via `checkRateLimit()`
   - `/api/embed`: 60 requests/minute
   - `/api/checkout/embed`: 30 requests/minute
2. **Input Validation:** All request parameters are validated before processing
3. **Read-Only (embed):** The `/api/embed` endpoint is GET-only and returns public data
4. **No Cookies/Auth:** These endpoints do not use session cookies or auth tokens, so CORS `*` does not expose authenticated data (browsers block `credentials: include` with wildcard origins)

### Do NOT Change

If you encounter `Access-Control-Allow-Origin: *` on these routes during a security audit, it is intentional. Removing it will break all third-party embeds. If tighter CORS is needed in the future, implement an allowlist of registered embed domains via the admin dashboard.

---

## All Other API Routes

All other API routes use the default Next.js CORS behavior (same-origin only). The middleware (`src/middleware.ts`) sets security headers including `X-Frame-Options: DENY` for non-embed routes.
