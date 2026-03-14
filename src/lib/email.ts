/**
 * Email notification utility.
 *
 * Uses a provider-agnostic interface so you can swap in Resend, SendGrid,
 * or any SMTP transport by implementing `sendRaw`.  When no provider is
 * configured the emails are logged to stdout (useful in dev / preview).
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ---------------------------------------------------------------------------
// Low-level send – swap provider here
// ---------------------------------------------------------------------------

async function sendRaw(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM || "Punchline Atlas <noreply@punchlineatlas.com>";

  // Resend
  if (apiKey && process.env.EMAIL_PROVIDER === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text }),
    });
    return res.ok;
  }

  // SendGrid
  if (apiKey && process.env.EMAIL_PROVIDER === "sendgrid") {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: from },
        subject: payload.subject,
        content: [
          { type: "text/plain", value: payload.text || "" },
          { type: "text/html", value: payload.html },
        ],
      }),
    });
    return res.ok || res.status === 202;
  }

  // Fallback – log to console (dev mode)
  console.log(`[EMAIL] To: ${payload.to} | Subject: ${payload.subject}`);
  return true;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    return await sendRaw(payload);
  } catch (err) {
    console.error("[EMAIL] Failed to send:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function digestEmailHtml(
  userName: string,
  items: Array<{ title: string; message: string; url?: string }>,
): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #333">
          <strong style="color:#d4a843">${item.title}</strong><br/>
          <span style="color:#aaa;font-size:14px">${item.message}</span>
          ${item.url ? `<br/><a href="${item.url}" style="color:#d4a843;font-size:13px">View &rarr;</a>` : ""}
        </td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#111;color:#eee;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <h1 style="color:#d4a843;font-size:22px;margin-bottom:4px">Punchline Atlas</h1>
    <p style="color:#999;font-size:14px;margin-top:0">Your comedy digest</p>
    <p style="color:#ccc">Hey ${userName},</p>
    <p style="color:#ccc">Here's what you missed:</p>
    <table style="width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:8px;overflow:hidden">
      ${rows}
    </table>
    <p style="color:#666;font-size:12px;margin-top:24px">
      You're receiving this because you enabled email digests in your
      <a href="${process.env.NEXTAUTH_URL || "https://punchline-atlas.vercel.app"}/settings" style="color:#d4a843">notification settings</a>.
    </p>
  </div>
</body>
</html>`;
}

export function eventReminderHtml(
  userName: string,
  eventTitle: string,
  venueName: string,
  dateStr: string,
  eventUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#111;color:#eee;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <h1 style="color:#d4a843;font-size:22px;margin-bottom:4px">Punchline Atlas</h1>
    <p style="color:#ccc">Hey ${userName},</p>
    <p style="color:#ccc">Reminder: <strong style="color:white">${eventTitle}</strong> at <strong>${venueName}</strong> is tomorrow (${dateStr})!</p>
    <a href="${eventUrl}" style="display:inline-block;padding:12px 24px;background:#d4a843;color:#111;font-weight:bold;border-radius:8px;text-decoration:none;margin-top:12px">View Event</a>
    <p style="color:#666;font-size:12px;margin-top:24px">You RSVP'd to this event on Punchline Atlas.</p>
  </div>
</body>
</html>`;
}
