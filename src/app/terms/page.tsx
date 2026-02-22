import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions | Punchline Atlas",
  description:
    "Terms and Conditions for Punchline Atlas — usage, conduct, and liability.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="text-sm text-zinc-400 hover:text-brand-gold transition-colors mb-6 inline-block"
      >
        ← Back to Discover
      </Link>

      <h1 className="text-3xl font-bold text-brand-gold mb-2">
        Terms and Conditions
      </h1>
      <p className="text-zinc-400 text-sm mb-10">
        Last updated: February 21, 2025
      </p>

      <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300">
        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using Punchline Atlas (&quot;the Service&quot;), you agree to
            be bound by these Terms and Conditions. If you do not agree, do not
            use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            2. Description of Service
          </h2>
          <p>
            Punchline Atlas is a platform for discovering comedy venues, tracking
            comedian tours, and following comedians and venues you enjoy. We
            aggregate publicly available information to help you find shows near
            you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            3. Account and Registration
          </h2>
          <p>
            Some features require a user account (e.g., following comedians and
            venues). You are responsible for maintaining the confidentiality of
            your account credentials. You agree to provide accurate information
            and to update it as needed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            4. Acceptable Use
          </h2>
          <p>You agree to use the Service only for lawful purposes. You must not:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on others&apos; intellectual property or rights</li>
            <li>Use the Service to harass, abuse, or harm others</li>
            <li>Attempt to gain unauthorized access to any system or data</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            5. Intellectual Property
          </h2>
          <p>
            The Service, including its design, content (except user-generated
            content and third-party data), and software, is owned by Punchline
            Atlas. You may not copy, modify, or distribute our content without
            permission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            6. Third-Party Content and Links
          </h2>
          <p>
            The Service may link to third-party sites and display content from
            external sources (e.g., ticket vendors, maps). We are not responsible
            for third-party content or practices. Your use of third-party
            services is subject to their terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            7. Disclaimer of Warranties
          </h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available.&quot; We do not
            warrant that event information, show times, or other data are
            accurate, complete, or up to date. Always verify details with
            venues or official sources before attending.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            8. Limitation of Liability
          </h2>
          <p>
            To the extent permitted by law, Punchline Atlas shall not be liable
            for any indirect, incidental, special, or consequential damages
            arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            9. Termination
          </h2>
          <p>
            We may suspend or terminate your access at any time for violations of
            these terms or for any other reason. You may delete your account at
            any time via Settings. Upon termination, your right to use the
            Service ceases.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            10. Changes to Terms
          </h2>
          <p>
            We may update these terms from time to time. The &quot;Last updated&quot; date
            will change. Continued use after changes constitutes acceptance. For
            material changes, we will provide notice where appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-2">
            11. Contact
          </h2>
          <p>
            For questions about these Terms and Conditions, contact us at{" "}
            <a
              href="mailto:legal@punchlineatlas.com"
              className="text-brand-gold hover:underline"
            >
              legal@punchlineatlas.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-zinc-800">
        <Link href="/" className="text-brand-gold hover:underline">
          ← Back to Discover
        </Link>
      </div>
    </main>
  );
}
