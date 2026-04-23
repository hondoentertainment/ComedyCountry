import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsActions } from "./SettingsActions";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { LocationAlertsSection } from "@/components/LocationAlertsSection";
import { CalendarFeedSection } from "@/components/CalendarFeedSection";
import { PreferredLocationManager } from "@/components/PreferredLocationManager";

export const metadata = {
  title: "Settings | Punchline Atlas",
  description: "Account settings, privacy policy, terms and conditions, and data management.",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settings");
  }

  let subscription: { plan: string; status: string; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean } | null = null;
  try {
    subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    });
  } catch {
    // Schema not migrated yet
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/profile"
          className="text-sm text-zinc-400 hover:text-brand-gold mb-4 inline-block"
        >
          ← Back to Profile
        </Link>

        <h1 className="text-3xl font-bold text-brand-gold mb-2">Settings</h1>
        <p className="text-zinc-400 mb-8">
          Manage your account and data preferences.
        </p>

        <section className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Subscription
            </h2>
            <SubscriptionManager
              currentPlan={subscription?.plan ?? null}
              status={subscription?.status ?? null}
              periodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
              cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Legal & Policies
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-zinc-300 hover:text-white"
                >
                  Terms and Conditions
                  <span className="text-zinc-500">→</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="flex items-center justify-between p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-zinc-300 hover:text-white"
                >
                  Privacy Policy
                  <span className="text-zinc-500">→</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Home market
            </h2>
            <PreferredLocationManager />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Location alerts
            </h2>
            <LocationAlertsSection />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Calendar sync
            </h2>
            <CalendarFeedSection />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Notifications
            </h2>
            <NotificationPreferences />
            <div className="mt-4">
              <PushNotificationToggle />
            </div>
          </div>

          <SettingsActions />
        </section>
      </div>
    </div>
  );
}
