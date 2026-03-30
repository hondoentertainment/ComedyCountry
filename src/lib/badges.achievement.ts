import { prisma } from "@/lib/prisma";

/**
 * Badge definitions and achievement checking for gamification.
 *
 * Badges are earned automatically when users perform actions.
 * Each badge has a condition function that checks if the user qualifies.
 */

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon key
  category: "social" | "content" | "engagement" | "milestone";
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Social badges
  {
    id: "first_follow",
    name: "First Fan",
    description: "Follow your first comedian",
    icon: "star",
    category: "social",
  },
  {
    id: "five_follows",
    name: "Comedy Buff",
    description: "Follow 5 comedians",
    icon: "fire",
    category: "social",
  },
  {
    id: "twenty_follows",
    name: "Super Fan",
    description: "Follow 20 comedians",
    icon: "trophy",
    category: "social",
  },
  {
    id: "venue_follower",
    name: "Regular",
    description: "Follow your first venue",
    icon: "home",
    category: "social",
  },

  // Content badges
  {
    id: "first_review",
    name: "Critic",
    description: "Write your first event review",
    icon: "pen",
    category: "content",
  },
  {
    id: "five_reviews",
    name: "Film at 11",
    description: "Write 5 event reviews",
    icon: "pencil",
    category: "content",
  },
  {
    id: "twenty_reviews",
    name: "Roger Ebert",
    description: "Write 20 event reviews",
    icon: "award",
    category: "content",
  },
  {
    id: "first_rating",
    name: "Tier Judge",
    description: "Rate your first comedian",
    icon: "scale",
    category: "content",
  },
  {
    id: "list_creator",
    name: "Curator",
    description: "Create your first comedy list",
    icon: "list",
    category: "content",
  },

  // Engagement badges
  {
    id: "first_rsvp",
    name: "Show Goer",
    description: "RSVP to your first event",
    icon: "ticket",
    category: "engagement",
  },
  {
    id: "five_rsvps",
    name: "Night Owl",
    description: "RSVP to 5 events",
    icon: "moon",
    category: "engagement",
  },
  {
    id: "group_creator",
    name: "Party Planner",
    description: "Create a show group",
    icon: "users",
    category: "engagement",
  },
  {
    id: "share_event",
    name: "Word of Mouth",
    description: "Share an event",
    icon: "share",
    category: "engagement",
  },

  // Milestone badges
  {
    id: "early_adopter",
    name: "Early Adopter",
    description: "Joined during beta",
    icon: "rocket",
    category: "milestone",
  },
  {
    id: "year_one",
    name: "One Year",
    description: "Been a member for one year",
    icon: "cake",
    category: "milestone",
  },
  {
    id: "profile_complete",
    name: "The Real Deal",
    description: "Complete your profile",
    icon: "check",
    category: "milestone",
  },
  {
    id: "trusted_critic",
    name: "Trusted Critic",
    description: "Write 20+ reviews with high helpful ratio",
    icon: "award",
    category: "milestone",
  },
];

/**
 * Check and award badges after a user action.
 * Called after key actions like following, reviewing, attending, etc.
 */
export async function checkAndAwardBadges(
  userId: string,
  action: string,
): Promise<string[]> {
  const awarded: string[] = [];

  try {
    // Get user's existing badges
    const existingBadges = await prisma.userBadge.findMany({
      where: { userId },
      select: { badge: true },
    });
    const hasBadge = new Set(existingBadges.map((b) => b.badge));

    // Check badges based on action type
    const badgesToCheck = getBadgesForAction(action);

    for (const badgeId of badgesToCheck) {
      if (hasBadge.has(badgeId)) continue;

      const earned = await checkBadgeCondition(userId, badgeId);
      if (earned) {
        await prisma.userBadge.create({
          data: { userId, badge: badgeId },
        });
        awarded.push(badgeId);

        // Create notification for badge
        const def = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
        if (def) {
          await prisma.notification.create({
            data: {
              userId,
              type: "badge_earned",
              title: `Badge Earned: ${def.name}`,
              message: def.description,
            },
          });
        }
      }
    }
  } catch {
    // Badge checking is non-critical
  }

  return awarded;
}

function getBadgesForAction(action: string): string[] {
  switch (action) {
    case "follow_comedian":
      return ["first_follow", "five_follows", "twenty_follows"];
    case "follow_venue":
      return ["venue_follower"];
    case "review_event":
    case "review_venue":
      return [
        "first_review",
        "five_reviews",
        "twenty_reviews",
        "trusted_critic",
      ];
    case "rate_comedian":
      return ["first_rating"];
    case "create_list":
      return ["list_creator"];
    case "rsvp_event":
      return ["first_rsvp", "five_rsvps"];
    case "create_group":
      return ["group_creator"];
    case "update_profile":
      return ["profile_complete"];
    default:
      return [];
  }
}

async function checkBadgeCondition(
  userId: string,
  badgeId: string,
): Promise<boolean> {
  switch (badgeId) {
    case "first_follow":
      return (await prisma.comedianFollow.count({ where: { userId } })) >= 1;
    case "five_follows":
      return (await prisma.comedianFollow.count({ where: { userId } })) >= 5;
    case "twenty_follows":
      return (await prisma.comedianFollow.count({ where: { userId } })) >= 20;
    case "venue_follower":
      return (await prisma.venueFollow.count({ where: { userId } })) >= 1;
    case "first_review":
      return (await prisma.eventReview.count({ where: { userId } })) >= 1;
    case "five_reviews":
      return (await prisma.eventReview.count({ where: { userId } })) >= 5;
    case "twenty_reviews":
      return (await prisma.eventReview.count({ where: { userId } })) >= 20;
    case "first_rating":
      return (
        (await prisma.comedianTierRating.count({ where: { userId } })) >= 1
      );
    case "list_creator":
      return (await prisma.comedyList.count({ where: { userId } })) >= 1;
    case "first_rsvp":
      return (await prisma.eventAttendance.count({ where: { userId } })) >= 1;
    case "five_rsvps":
      return (await prisma.eventAttendance.count({ where: { userId } })) >= 5;
    case "group_creator":
      return (
        (await prisma.showGroup.count({ where: { creatorId: userId } })) >= 1
      );
    case "profile_complete": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, username: true },
      });
      return !!(user?.name && user?.image && user?.username);
    }
    case "year_one": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (!user) return false;
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return user.createdAt <= oneYearAgo;
    }
    case "trusted_critic": {
      const reviewCount = await prisma.eventReview.count({ where: { userId } });
      if (reviewCount < 20) return false;
      // Check helpful ratio: user has at least some helpful reactions
      const userReviews = await prisma.eventReview.findMany({
        where: { userId },
        select: { id: true },
      });
      const helpfulCount = await prisma.reviewReaction.count({
        where: {
          reviewType: "event_review",
          reviewId: { in: userReviews.map((r) => r.id) },
          reactionType: "helpful",
        },
      });
      return helpfulCount >= 10;
    }
    default:
      return false;
  }
}

/**
 * Get a user's earned badges with definitions.
 */
export async function getUserBadges(userId: string) {
  const earned = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });

  return earned.map((b) => {
    const def = BADGE_DEFINITIONS.find((d) => d.id === b.badge);
    return {
      id: b.badge,
      name: def?.name || b.badge,
      description: def?.description || "",
      icon: def?.icon || "star",
      category: def?.category || "milestone",
      earnedAt: b.earnedAt,
    };
  });
}
