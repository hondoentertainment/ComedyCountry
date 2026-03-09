/**
 * Stripe integration for Punchline Atlas subscriptions.
 * Uses Stripe Checkout Sessions for payment flow and webhooks for lifecycle.
 */

// Price IDs mapped to subscription plans
const PRICE_MAP: Record<string, string> = {
  FAN_PRO: process.env.STRIPE_PRICE_FAN_PRO || "price_fan_pro",
  COMEDIAN_PRO: process.env.STRIPE_PRICE_COMEDIAN_PRO || "price_comedian_pro",
  COMEDIAN_PREMIUM: process.env.STRIPE_PRICE_COMEDIAN_PREMIUM || "price_comedian_premium",
  VENUE_PRO: process.env.STRIPE_PRICE_VENUE_PRO || "price_venue_pro",
  VENUE_PREMIUM: process.env.STRIPE_PRICE_VENUE_PREMIUM || "price_venue_premium",
};

const PLAN_NAMES: Record<string, string> = {
  FAN_PRO: "Fan Pro",
  COMEDIAN_PRO: "Comedian Pro",
  COMEDIAN_PREMIUM: "Comedian Premium",
  VENUE_PRO: "Venue Pro",
  VENUE_PREMIUM: "Venue Premium",
};

export function getStripePriceId(plan: string): string | null {
  return PRICE_MAP[plan] || null;
}

export function getPlanName(plan: string): string {
  return PLAN_NAMES[plan] || plan;
}

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Create a Stripe Checkout Session.
 * Returns the session URL for redirect.
 */
export async function createCheckoutSession(params: {
  plan: string;
  userId: string;
  email: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const priceId = getStripePriceId(params.plan);
  if (!priceId) throw new Error(`Invalid plan: ${params.plan}`);

  const body: Record<string, unknown> = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: { userId: params.userId, plan: params.plan },
  };

  if (params.customerId) {
    body.customer = params.customerId;
  } else {
    body.customer_email = params.email;
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeFormData(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Stripe error: ${err.error?.message || res.statusText}`);
  }

  const session = await res.json();
  return { url: session.url, sessionId: session.id };
}

/**
 * Create a Stripe billing portal session for subscription management.
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ customer: customerId, return_url: returnUrl }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Stripe portal error: ${err.error?.message || res.statusText}`);
  }

  const session = await res.json();
  return session.url;
}

/**
 * Verify a Stripe webhook signature.
 * Uses the raw body and Stripe-Signature header.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Promise<{ valid: boolean; event?: Record<string, unknown> }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { valid: false };

  // Stripe signature verification using Web Crypto API
  const parts = signature.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.signatures.push(value);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] }
  );

  if (!parts.timestamp || parts.signatures.length === 0) return { valid: false };

  const payload = `${parts.timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const isValid = parts.signatures.some((s) => s === expected);

  if (!isValid) return { valid: false };

  // Check timestamp tolerance (5 minutes)
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(parts.timestamp)) > tolerance) return { valid: false };

  return { valid: true, event: JSON.parse(rawBody) };
}

/** Encode nested object to x-www-form-urlencoded format for Stripe API */
function encodeFormData(obj: Record<string, unknown>, prefix = ""): URLSearchParams {
  const params = new URLSearchParams();

  function flatten(data: unknown, key: string) {
    if (Array.isArray(data)) {
      data.forEach((item, i) => flatten(item, `${key}[${i}]`));
    } else if (typeof data === "object" && data !== null) {
      Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
        flatten(v, key ? `${key}[${k}]` : k);
      });
    } else if (data !== undefined && data !== null) {
      params.append(key, String(data));
    }
  }

  flatten(obj, prefix);
  return params;
}
