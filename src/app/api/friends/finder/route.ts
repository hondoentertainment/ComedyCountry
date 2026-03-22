import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  searchUsers,
  findByUsername,
  generateInviteLink,
  importContacts,
  getFriendSuggestions,
} from "@/lib/friend-finder";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/friends/finder
 *
 * Search for users or get friend suggestions.
 * Query params:
 *   ?q=<search>         - search by name/username
 *   ?username=<exact>   - find by exact username
 *   ?suggestions=true   - get friend suggestions
 *   ?limit=<n>          - max results (default 20)
 */
export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(`friends-finder:${getRateLimitKey(req)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const username = searchParams.get("username");
    const suggestions = searchParams.get("suggestions");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    if (suggestions === "true") {
      const results = await getFriendSuggestions(session.user.id, { limit });
      return NextResponse.json({ suggestions: results });
    }

    if (username) {
      const user = await findByUsername(username);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ user });
    }

    if (query) {
      const results = await searchUsers(query, {
        limit,
        excludeUserId: session.user.id,
      });
      return NextResponse.json({ users: results });
    }

    return NextResponse.json(
      { error: "Provide q, username, or suggestions=true" },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search users";
    const status = message.includes("at least 2 characters") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/friends/finder
 *
 * Actions:
 *   { action: "invite" }                    - Generate an invite link
 *   { action: "import", emails: string[] }  - Import contacts by email
 */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`friends-finder:${getRateLimitKey(req)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "invite") {
      const result = await generateInviteLink(session.user.id);
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "import") {
      const { emails } = body;
      if (!Array.isArray(emails)) {
        return NextResponse.json(
          { error: "emails must be an array of strings" },
          { status: 400 }
        );
      }

      const result = await importContacts(session.user.id, emails);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'action must be "invite" or "import"' },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
