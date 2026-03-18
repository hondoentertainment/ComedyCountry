import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

/** Plans that grant Pro fan features (calendar feed, unlimited location alerts, etc.) */
const FAN_PRO_PLANS: SubscriptionPlan[] = ["FAN_PRO"];

const ACTIVE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING"];

export function hasProPlan(plan: string): boolean {
  return FAN_PRO_PLANS.includes(plan as SubscriptionPlan);
}

/**
 * Free: 1 location alert max.
 * Pro (FAN_PRO): unlimited.
 */
export async function canUseLocationAlerts(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE_STATUSES } },
    select: { plan: true },
  });
  if (sub && hasProPlan(sub.plan)) return true;

  const count = await prisma.locationAlert.count({ where: { userId } });
  return count < 1;
}

/**
 * Pro (FAN_PRO) only.
 */
export async function canUseCalendarFeed(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE_STATUSES } },
    select: { plan: true },
  });
  return !!(sub && hasProPlan(sub.plan));
}

/**
 * Pro only, or default true for all for now (reminders are low cost).
 */
export async function canUseEventReminders(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE_STATUSES } },
    select: { plan: true },
  });
  if (sub && hasProPlan(sub.plan)) return true;
  return true; // default true for all for now
}
