import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import { CookieConsentProvider, CookieBanner } from "@/components/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Punchline Atlas | Comedy Venues & Comedian Tours",
  description:
    "The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans flex flex-col">
        <SessionProvider>
        <CookieConsentProvider>
          <Nav />
          <div className="flex-1">{children}</div>
          <Footer />
          <CookieBanner />
        </CookieConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
