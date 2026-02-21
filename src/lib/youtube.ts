/**
 * YouTube Data API v3 integration for comedian channel stats.
 * Requires YOUTUBE_API_KEY in environment.
 *
 * Accepts either channel ID (UC...) or handle (@handle or handle).
 */

type YouTubeChannelStats = {
  channelId: string;
  subscriberCount: number;
  videoCount: number;
};

type YouTubeApiError = {
  code: number;
  message: string;
  errors?: Array<{ reason: string }>;
};

function isChannelId(value: string): boolean {
  return /^UC[\w-]{22}$/.test(value);
}

export async function fetchChannelStats(
  channelIdOrHandle: string
): Promise<YouTubeChannelStats | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[youtube] YOUTUBE_API_KEY not set, skipping sync");
    return null;
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "statistics");
  url.searchParams.set("key", apiKey);

  const handle = channelIdOrHandle.startsWith("@")
    ? channelIdOrHandle.slice(1)
    : channelIdOrHandle;

  if (isChannelId(channelIdOrHandle)) {
    url.searchParams.set("id", channelIdOrHandle);
  } else {
    url.searchParams.set("forHandle", handle);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    const err = data as { error?: YouTubeApiError };
    if (err?.error?.errors?.[0]?.reason === "channelNotFound") return null;
    throw new Error(
      err?.error?.message ?? `YouTube API error: ${res.status}`
    );
  }

  const items = data.items as Array<{
    id: string;
    statistics?: { subscriberCount: string; videoCount: string };
  }> | undefined;

  if (!items?.length) return null;
  const channel = items[0];
  const stats = channel.statistics;
  if (!stats) return null;

  return {
    channelId: channel.id,
    subscriberCount: parseInt(stats.subscriberCount ?? "0", 10),
    videoCount: parseInt(stats.videoCount ?? "0", 10),
  };
}
