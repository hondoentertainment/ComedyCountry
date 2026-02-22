import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Punchline Atlas",
  description:
    "Privacy Policy for Punchline Atlas — how we collect, use, and protect your data. GDPR compliant.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="text-sm text-zinc-400 hover:text-brand-gold transition-colors mb-6 inline-block"
      >
        ← Back to Discover
      </Link>

      <h1 className="text-3xl font-bold text-brand-gold mb-2">
        Privacy Policy
      </h1>
      <p className="text-zinc-400 text-sm mb-10">
        Last updated: February 21, 2025
      </p>

      <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300">
        <section>
          <h2 className="text-xl font-semibold text-white mb-2">1. Data Controller</h2>
          <p>
            Punchline Atlas (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Punchline Atlas platform.
            For privacy-related enquiries, contact us at{" "}
            <a
              href="mailto:privacy@punchlineatlas.com"
              className="text-brand-gold hover:underline"
            >
              privacy@punchlineatlas.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">2. Data We Collect</h2>
          <p>
            Punchline Atlas is designed with privacy in mind. We do not collect or store personal data about visitors through our own systems. The following applies:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              <strong>No account required:</strong> You can use the site without creating an account. We do not collect names, emails, or identifiers from casual visitors.
            </li>
            <li>
              <strong>Server logs:</strong> Our hosting provider (Vercel) may log IP addresses and request metadata for security and operations. This data is processed according to their privacy policy and may be retained briefly.
            </li>
            <li>
              <strong>Third-party services:</strong> Our map feature uses Google Maps. When you visit pages with the map and accept cookies, Google may collect data per their{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold hover:underline"
              >
                Privacy Policy
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">3. Cookies</h2>
          <p>
            We use a cookie-consent mechanism. Until you accept, we avoid loading services that set non-essential cookies.
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              <strong>Essential:</strong> Minimal cookies may be used for site functionality (e.g., consent preference).
            </li>
            <li>
              <strong>Non-essential:</strong> Google Maps sets cookies when you accept and view the map. These are used by Google for their services.
            </li>
          </ul>
          <p className="mt-2">
            You can withdraw consent at any time by clearing cookies or contacting us. Withdrawal does not affect the lawfulness of processing before withdrawal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">4. Legal Basis (GDPR)</h2>
          <p>For visitors in the European Economic Area (EEA) and UK:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              <strong>Consent (Art. 6(1)(a)):</strong> For non-essential cookies and third-party services (e.g., Google Maps).
            </li>
            <li>
              <strong>Legitimate interest (Art. 6(1)(f)):</strong> For essential technical logs and security.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">5. Your Rights (GDPR)</h2>
          <p>If you are in the EEA or UK, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><strong>Access</strong> — request a copy of personal data we hold about you</li>
            <li><strong>Rectification</strong> — correct inaccurate data</li>
            <li><strong>Erasure</strong> — request deletion of your data</li>
            <li><strong>Restriction</strong> — limit how we process your data</li>
            <li><strong>Portability</strong> — receive your data in a structured format</li>
            <li><strong>Object</strong> — object to processing based on legitimate interest</li>
            <li><strong>Withdraw consent</strong> — where processing is based on consent</li>
            <li><strong>Complain</strong> — lodge a complaint with your supervisory authority</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, email{" "}
            <a
              href="mailto:privacy@punchlineatlas.com"
              className="text-brand-gold hover:underline"
            >
              privacy@punchlineatlas.com
            </a>
            . We will respond within 30 days. Programmatic requests may be sent to <code className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">POST /api/privacy</code> with{" "}
            <code className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">{"{ \"type\": \"access\" | \"erasure\" | \"export\" }"}</code>. You may also complain to your local data protection authority.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">6. Data Retention</h2>
          <p>
            We do not retain personal data from visitors beyond what is necessary. Server logs are typically retained briefly by our host. Cookie consent preferences are stored locally in your browser.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">7. International Transfers</h2>
          <p>
            Our infrastructure is hosted in regions that may be outside the EEA. Where applicable, we rely on adequacy decisions or appropriate safeguards (e.g., Standard Contractual Clauses) for transfers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">8. Children</h2>
          <p>
            Our service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe we have collected data from a child, contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">9. Changes</h2>
          <p>
            We may update this policy. The &quot;Last updated&quot; date at the top will change. Continued use after changes implies acceptance. For material changes, we will provide notice where appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">10. Contact</h2>
          <p>
            For privacy enquiries, data subject requests, or questions:
          </p>
          <p className="mt-2">
            Email:{" "}
            <a
              href="mailto:privacy@punchlineatlas.com"
              className="text-brand-gold hover:underline"
            >
              privacy@punchlineatlas.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-zinc-800">
        <Link
          href="/"
          className="text-brand-gold hover:underline"
        >
          ← Back to Discover
        </Link>
      </div>
    </main>
  );
}
