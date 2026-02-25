import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import { CookieConsentProvider, CookieBanner } from "@/components/CookieConsent";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Punchline Atlas | Comedy Venues & Comedian Tours",
    template: "%s | Punchline Atlas",
  },
  description:
    "The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.",
  keywords: ["comedy", "comedians", "comedy clubs", "stand-up", "venues", "events", "tours"],
  authors: [{ name: "Punchline Atlas" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Punchline Atlas",
    title: "Punchline Atlas | Comedy Venues & Comedian Tours",
    description:
      "The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Punchline Atlas — Comedy Venues & Comedian Tours",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Punchline Atlas | Comedy Venues & Comedian Tours",
    description:
      "The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-gold focus:text-brand-dark focus:font-semibold focus:outline-none"
        >
          Skip to content
        </a>
        <SessionProvider>
        <ToastProvider>
        <CookieConsentProvider>
          <Nav />
          <main id="main" className="flex-1" tabIndex={-1}>
          {children}
          </main>
          <Footer />
          <CookieBanner />
        </CookieConsentProvider>
        </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
