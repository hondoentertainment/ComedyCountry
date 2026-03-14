import { prisma } from "./prisma";

// =============================================================================
// Types
// =============================================================================

type ModerationVerdict = "APPROVED" | "FLAGGED" | "REJECTED" | "PENDING_REVIEW";

type ModerationCategory =
  | "profanity"
  | "spam"
  | "hate_speech"
  | "harassment"
  | "sexual_content"
  | "violence"
  | "clean";

type TextModerationResult = {
  verdict: ModerationVerdict;
  categories: ModerationCategory[];
  score: number; // 0-1, higher = more problematic
  flaggedTerms: string[];
  details: string;
};

type MediaModerationResult = {
  verdict: ModerationVerdict;
  score: number; // 0-1
  categories: string[];
  details: string;
};

type ModerationQueueItem = {
  id: string;
  contentType: string;
  contentId: string;
  userId: string;
  reason: string;
  status: ModerationVerdict;
  createdAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
};

type AutoModerationRule = {
  id: string;
  name: string;
  pattern: string;
  action: "flag" | "reject" | "shadow_ban";
  category: ModerationCategory;
  enabled: boolean;
  priority: number;
};

type UserStrikeRecord = {
  userId: string;
  strikes: number;
  lastStrikeAt: Date | null;
  banned: boolean;
  strikeHistory: Array<{
    reason: string;
    category: ModerationCategory;
    date: Date;
  }>;
};

// =============================================================================
// Profanity & Hate Speech Word Lists
// =============================================================================

const PROFANITY_PATTERNS = [
  /\bf+u+c+k+/i,
  /\bs+h+i+t+/i,
  /\ba+s+s+h+o+l+e+/i,
  /\bb+i+t+c+h+/i,
  /\bd+a+m+n+/i,
  /\bc+r+a+p+/i,
  /\bp+i+s+s+/i,
  /\bb+a+s+t+a+r+d+/i,
];

const HATE_SPEECH_PATTERNS = [
  /\b(kike|spic|chink|wetback|raghead|towelhead)\b/i,
  /\b(kill|murder|exterminate)\s+(all|every)\s+\w+/i,
  /\b(subhuman|inferior\s+race)\b/i,
  /\bdeath\s+to\s+/i,
];

const SPAM_PATTERNS = [
  /\b(buy\s+now|click\s+here|free\s+money|act\s+now)\b/i,
  /\b(make\s+\$?\d+\s*k?\s*(per|a)\s*(day|week|month))\b/i,
  /https?:\/\/\S+.*https?:\/\/\S+.*https?:\/\/\S+/i, // 3+ URLs in text
  /(.)\1{10,}/, // excessive character repetition
  /\b(viagra|cialis|crypto\s+invest)\b/i,
];

const HARASSMENT_PATTERNS = [
  /\b(i('ll|m\s+going\s+to)?\s+(kill|hurt|stalk)\s+(you|them))\b/i,
  /\b(kys|kill\s+yourself)\b/i,
  /\byou\s+(should|need\s+to)\s+(die|disappear)\b/i,
];

// =============================================================================
// Text Moderation
// =============================================================================

export function moderateText(text: string): TextModerationResult {
  if (!text || typeof text !== "string") {
    return {
      verdict: "APPROVED",
      categories: ["clean"],
      score: 0,
      flaggedTerms: [],
      details: "Empty or invalid text",
    };
  }

  const categories: ModerationCategory[] = [];
  const flaggedTerms: string[] = [];
  let score = 0;

  // Check hate speech (highest severity)
  for (const pattern of HATE_SPEECH_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      categories.push("hate_speech");
      flaggedTerms.push(match[0]);
      score = Math.max(score, 0.95);
    }
  }

  // Check harassment
  for (const pattern of HARASSMENT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      categories.push("harassment");
      flaggedTerms.push(match[0]);
      score = Math.max(score, 0.9);
    }
  }

  // Check profanity
  for (const pattern of PROFANITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (!categories.includes("profanity")) categories.push("profanity");
      flaggedTerms.push(match[0]);
      score = Math.max(score, 0.5);
    }
  }

  // Check spam
  for (const pattern of SPAM_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      categories.push("spam");
      flaggedTerms.push(match[0]);
      score = Math.max(score, 0.7);
    }
  }

  // Determine verdict
  let verdict: ModerationVerdict;
  if (score >= 0.9) {
    verdict = "REJECTED";
  } else if (score >= 0.5) {
    verdict = "FLAGGED";
  } else {
    verdict = "APPROVED";
    if (categories.length === 0) categories.push("clean");
  }

  const details =
    verdict === "APPROVED"
      ? "Content passed moderation"
      : `Detected: ${categories.join(", ")}`;

  return { verdict, categories, score, flaggedTerms, details };
}

// =============================================================================
// Media Moderation Scoring
// =============================================================================

export function scoreMediaContent(metadata: {
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
}): MediaModerationResult {
  const categories: string[] = [];
  let score = 0;

  // Check file type
  const mimeType = metadata.mimeType ?? "";
  const allowedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ];
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  const allowedTypes = [...allowedVideoTypes, ...allowedImageTypes];

  if (mimeType && !allowedTypes.includes(mimeType)) {
    categories.push("unsupported_format");
    score = Math.max(score, 0.8);
  }

  // Check file size (max 500MB for video, 10MB for images)
  const maxSize = mimeType.startsWith("video/") ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
  if (metadata.fileSizeBytes && metadata.fileSizeBytes > maxSize) {
    categories.push("oversized_file");
    score = Math.max(score, 0.6);
  }

  // Check video duration (max 30 minutes)
  if (metadata.durationSeconds && metadata.durationSeconds > 1800) {
    categories.push("excessive_duration");
    score = Math.max(score, 0.4);
  }

  // Check associated text content
  const textToCheck = [metadata.title, metadata.description]
    .filter(Boolean)
    .join(" ");
  if (textToCheck) {
    const textResult = moderateText(textToCheck);
    if (textResult.score > 0) {
      score = Math.max(score, textResult.score);
      categories.push(...textResult.categories);
    }
  }

  let verdict: ModerationVerdict;
  if (score >= 0.8) {
    verdict = "REJECTED";
  } else if (score >= 0.4) {
    verdict = "FLAGGED";
  } else {
    verdict = "APPROVED";
  }

  return {
    verdict,
    score,
    categories: categories.length > 0 ? categories : ["clean"],
    details:
      verdict === "APPROVED"
        ? "Media passed moderation checks"
        : `Issues detected: ${categories.join(", ")}`,
  };
}

// =============================================================================
// Auto-Moderation Rules Engine
// =============================================================================

// In-memory store for rules (in production, these would come from DB)
let autoModerationRules: AutoModerationRule[] = [
  {
    id: "rule-spam-links",
    name: "Block spam links",
    pattern: "(https?://[^\\s]+){3,}",
    action: "reject",
    category: "spam",
    enabled: true,
    priority: 1,
  },
  {
    id: "rule-hate-speech",
    name: "Auto-reject hate speech",
    pattern: "\\b(death\\s+to|exterminate)\\b",
    action: "reject",
    category: "hate_speech",
    enabled: true,
    priority: 0,
  },
  {
    id: "rule-profanity-flag",
    name: "Flag excessive profanity",
    pattern: "\\b(fuck|shit)\\b",
    action: "flag",
    category: "profanity",
    enabled: true,
    priority: 2,
  },
];

export function getAutoModerationRules(): AutoModerationRule[] {
  return [...autoModerationRules].sort((a, b) => a.priority - b.priority);
}

export function addAutoModerationRule(
  rule: Omit<AutoModerationRule, "id">,
): AutoModerationRule {
  const newRule: AutoModerationRule = {
    ...rule,
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  autoModerationRules.push(newRule);
  return newRule;
}

export function removeAutoModerationRule(ruleId: string): boolean {
  const idx = autoModerationRules.findIndex((r) => r.id === ruleId);
  if (idx === -1) return false;
  autoModerationRules.splice(idx, 1);
  return true;
}

export function applyAutoModerationRules(text: string): {
  action: "approve" | "flag" | "reject" | "shadow_ban";
  matchedRules: AutoModerationRule[];
} {
  const enabledRules = autoModerationRules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  const matchedRules: AutoModerationRule[] = [];
  let highestAction: "approve" | "flag" | "reject" | "shadow_ban" = "approve";

  const actionPriority = { approve: 0, flag: 1, reject: 2, shadow_ban: 3 };

  for (const rule of enabledRules) {
    try {
      const regex = new RegExp(rule.pattern, "gi");
      if (regex.test(text)) {
        matchedRules.push(rule);
        if (actionPriority[rule.action] > actionPriority[highestAction]) {
          highestAction = rule.action;
        }
      }
    } catch {
      // Invalid regex, skip rule
    }
  }

  return { action: highestAction, matchedRules };
}

// Reset rules (useful for testing)
export function resetAutoModerationRules(): void {
  autoModerationRules = [
    {
      id: "rule-spam-links",
      name: "Block spam links",
      pattern: "(https?://[^\\s]+){3,}",
      action: "reject",
      category: "spam",
      enabled: true,
      priority: 1,
    },
    {
      id: "rule-hate-speech",
      name: "Auto-reject hate speech",
      pattern: "\\b(death\\s+to|exterminate)\\b",
      action: "reject",
      category: "hate_speech",
      enabled: true,
      priority: 0,
    },
    {
      id: "rule-profanity-flag",
      name: "Flag excessive profanity",
      pattern: "\\b(fuck|shit)\\b",
      action: "flag",
      category: "profanity",
      enabled: true,
      priority: 2,
    },
  ];
}

// =============================================================================
// Moderation Queue Management
// =============================================================================

export async function addToModerationQueue(item: {
  contentType: string;
  contentId: string;
  userId: string;
  reason: string;
}): Promise<ModerationQueueItem> {
  const record = await prisma.analyticsEvent.create({
    data: {
      eventType: "moderation_queue",
      entityType: item.contentType,
      entityId: item.contentId,
      userId: item.userId,
      metadata: {
        reason: item.reason,
        status: "PENDING_REVIEW",
      },
    },
  });

  return {
    id: record.id,
    contentType: item.contentType,
    contentId: item.contentId,
    userId: item.userId,
    reason: item.reason,
    status: "PENDING_REVIEW",
    createdAt: record.createdAt,
    reviewedAt: null,
    reviewedBy: null,
  };
}

export async function getModerationQueue(
  status?: ModerationVerdict,
  limit = 50,
): Promise<ModerationQueueItem[]> {
  const where: Record<string, unknown> = {
    eventType: "moderation_queue",
  };

  if (status) {
    where.metadata = { path: ["status"], equals: status };
  }

  const records = await prisma.analyticsEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return records.map((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      contentType: r.entityType ?? "",
      contentId: r.entityId ?? "",
      userId: r.userId ?? "",
      reason: (meta.reason as string) ?? "",
      status: (meta.status as ModerationVerdict) ?? "PENDING_REVIEW",
      createdAt: r.createdAt,
      reviewedAt: (meta.reviewedAt as Date) ?? null,
      reviewedBy: (meta.reviewedBy as string) ?? null,
    };
  });
}

export async function reviewModerationItem(
  itemId: string,
  decision: ModerationVerdict,
  reviewerId: string,
): Promise<ModerationQueueItem> {
  const record = await prisma.analyticsEvent.update({
    where: { id: itemId },
    data: {
      metadata: {
        status: decision,
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewerId,
      },
    },
  });

  const meta = (record.metadata ?? {}) as Record<string, unknown>;

  return {
    id: record.id,
    contentType: record.entityType ?? "",
    contentId: record.entityId ?? "",
    userId: record.userId ?? "",
    reason: (meta.reason as string) ?? "",
    status: decision,
    createdAt: record.createdAt,
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
  };
}

// =============================================================================
// 3-Strike System
// =============================================================================

export async function getUserStrikes(userId: string): Promise<UserStrikeRecord> {
  const strikes = await prisma.analyticsEvent.findMany({
    where: {
      eventType: "moderation_strike",
      userId,
    },
    orderBy: { createdAt: "desc" },
  });

  const strikeHistory = strikes.map((s) => {
    const meta = (s.metadata ?? {}) as Record<string, unknown>;
    return {
      reason: (meta.reason as string) ?? "",
      category: (meta.category as ModerationCategory) ?? "profanity",
      date: s.createdAt,
    };
  });

  return {
    userId,
    strikes: strikes.length,
    lastStrikeAt: strikes.length > 0 ? strikes[0].createdAt : null,
    banned: strikes.length >= 3,
    strikeHistory,
  };
}

export async function issueStrike(
  userId: string,
  reason: string,
  category: ModerationCategory,
): Promise<UserStrikeRecord> {
  await prisma.analyticsEvent.create({
    data: {
      eventType: "moderation_strike",
      entityType: "user",
      entityId: userId,
      userId,
      metadata: {
        reason,
        category,
        issuedAt: new Date().toISOString(),
      },
    },
  });

  const record = await getUserStrikes(userId);

  // Auto-ban after 3 strikes
  if (record.strikes >= 3) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "BANNED" },
      });
    } catch {
      // User table may not have BANNED role; log the ban intent
    }
  }

  return record;
}

export async function removeStrike(
  userId: string,
  strikeId: string,
): Promise<UserStrikeRecord> {
  await prisma.analyticsEvent.delete({
    where: { id: strikeId },
  });

  return getUserStrikes(userId);
}

// =============================================================================
// Full Content Moderation Pipeline
// =============================================================================

export async function moderateContent(input: {
  text?: string;
  media?: {
    fileName?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    durationSeconds?: number;
    title?: string;
    description?: string;
  };
  userId: string;
  contentType: string;
  contentId: string;
}): Promise<{
  allowed: boolean;
  verdict: ModerationVerdict;
  textResult?: TextModerationResult;
  mediaResult?: MediaModerationResult;
  autoModAction?: string;
  userStrikes: UserStrikeRecord;
}> {
  // 1. Check user strikes first
  const strikes = await getUserStrikes(input.userId);
  if (strikes.banned) {
    return {
      allowed: false,
      verdict: "REJECTED",
      userStrikes: strikes,
    };
  }

  let textResult: TextModerationResult | undefined;
  let mediaResult: MediaModerationResult | undefined;
  let worstScore = 0;

  // 2. Moderate text
  if (input.text) {
    textResult = moderateText(input.text);
    worstScore = Math.max(worstScore, textResult.score);
  }

  // 3. Moderate media
  if (input.media) {
    mediaResult = scoreMediaContent(input.media);
    worstScore = Math.max(worstScore, mediaResult.score);
  }

  // 4. Apply auto-moderation rules
  let autoModAction: string | undefined;
  if (input.text) {
    const ruleResult = applyAutoModerationRules(input.text);
    autoModAction = ruleResult.action;
    if (ruleResult.action === "reject" || ruleResult.action === "shadow_ban") {
      worstScore = Math.max(worstScore, 0.95);
    } else if (ruleResult.action === "flag") {
      worstScore = Math.max(worstScore, 0.5);
    }
  }

  // 5. Determine final verdict
  let verdict: ModerationVerdict;
  if (worstScore >= 0.9) {
    verdict = "REJECTED";
  } else if (worstScore >= 0.5) {
    verdict = "FLAGGED";
  } else {
    verdict = "APPROVED";
  }

  // 6. Add to moderation queue if flagged/rejected
  if (verdict !== "APPROVED") {
    const reason = [
      textResult?.details,
      mediaResult?.details,
      autoModAction ? `Auto-mod: ${autoModAction}` : null,
    ]
      .filter(Boolean)
      .join("; ");

    await addToModerationQueue({
      contentType: input.contentType,
      contentId: input.contentId,
      userId: input.userId,
      reason,
    });
  }

  // 7. Issue strike for rejected content
  if (verdict === "REJECTED") {
    const category =
      textResult?.categories.find((c) => c !== "clean") ??
      "profanity";
    await issueStrike(
      input.userId,
      `Content rejected: ${textResult?.details ?? mediaResult?.details ?? "policy violation"}`,
      category,
    );
  }

  // Re-fetch strikes after potential new strike
  const updatedStrikes = await getUserStrikes(input.userId);

  return {
    allowed: verdict === "APPROVED",
    verdict,
    textResult,
    mediaResult,
    autoModAction,
    userStrikes: updatedStrikes,
  };
}
