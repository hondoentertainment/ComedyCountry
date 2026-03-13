import { prisma } from "./prisma";

/**
 * Streaming Platform Sync — connects Spotify/Apple Music listening data
 * to bootstrap and enrich comedy taste profiles.
 *
 * Maps music genres and comedy album listening history to comedian preferences.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type StreamingPlatform = "SPOTIFY" | "APPLE_MUSIC";

export interface StreamingConnection {
  id: string;
  userId: string;
  platform: StreamingPlatform;
  platformUserId: string;
  accessToken: string;
  refreshToken: string | null;
  connectedAt: Date;
  lastSyncedAt: Date | null;
  isActive: boolean;
}

export interface StreamingArtist {
  platformId: string;
  name: string;
  genres: string[];
  popularity: number;
}

export interface StreamingListeningData {
  topArtists: StreamingArtist[];
  topGenres: Array<{ genre: string; weight: number }>;
  comedyAlbums: Array<{
    artistName: string;
    albumName: string;
    playCount: number;
  }>;
  recentlyPlayed: Array<{
    artistName: string;
    trackName: string;
    playedAt: string;
  }>;
}

export interface SyncResult {
  connection: StreamingConnection;
  genresImported: number;
  comedianMatches: Array<{
    comedianId: string;
    comedianName: string;
    matchReason: string;
    confidence: number;
  }>;
  tasteProfileUpdated: boolean;
}

// ── Genre mapping: music genres → comedy genres ──────────────────────────────

const MUSIC_TO_COMEDY_GENRE_MAP: Record<string, string[]> = {
  "comedy": ["standup", "sketch"],
  "stand-up comedy": ["standup"],
  "sketch comedy": ["sketch"],
  "improv comedy": ["improv"],
  "political satire": ["political", "satire"],
  "hip hop": ["urban", "storytelling"],
  "punk": ["alternative", "edgy"],
  "indie": ["alternative", "indie"],
  "jazz": ["observational", "storytelling"],
  "blues": ["storytelling", "dark"],
  "folk": ["storytelling", "clean"],
  "country": ["storytelling", "rural"],
  "pop": ["mainstream", "observational"],
  "rock": ["alternative", "edgy"],
  "metal": ["dark", "edgy"],
  "r&b": ["storytelling", "observational"],
  "soul": ["storytelling", "observational"],
  "electronic": ["experimental", "absurdist"],
  "classical": ["intellectual", "observational"],
  "spoken word": ["storytelling", "spoken_word"],
};

function mapMusicGenresToComedyGenres(musicGenres: string[]): Record<string, number> {
  const comedyScores: Record<string, number> = {};

  for (const genre of musicGenres) {
    const lower = genre.toLowerCase();
    // Direct comedy genre match
    for (const [musicGenre, comedyGenres] of Object.entries(MUSIC_TO_COMEDY_GENRE_MAP)) {
      if (lower.includes(musicGenre)) {
        for (const cg of comedyGenres) {
          comedyScores[cg] = (comedyScores[cg] || 0) + 1;
        }
      }
    }
  }

  // Normalize scores
  const max = Math.max(...Object.values(comedyScores), 1);
  for (const key of Object.keys(comedyScores)) {
    comedyScores[key] = Math.round((comedyScores[key] / max) * 100) / 100;
  }

  return comedyScores;
}

// ── Connection management ────────────────────────────────────────────────────

export async function connectStreamingPlatform(
  userId: string,
  platform: StreamingPlatform,
  credentials: {
    platformUserId: string;
    accessToken: string;
    refreshToken?: string;
  }
): Promise<StreamingConnection> {
  const existing = await prisma.streamingConnection.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (existing) {
    const updated = await prisma.streamingConnection.update({
      where: { id: existing.id },
      data: {
        platformUserId: credentials.platformUserId,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken ?? existing.refreshToken,
        isActive: true,
      },
    });
    return updated as StreamingConnection;
  }

  const connection = await prisma.streamingConnection.create({
    data: {
      userId,
      platform,
      platformUserId: credentials.platformUserId,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken ?? null,
    },
  });

  return connection as StreamingConnection;
}

export async function disconnectStreamingPlatform(
  userId: string,
  platform: StreamingPlatform
): Promise<void> {
  await prisma.streamingConnection.updateMany({
    where: { userId, platform },
    data: { isActive: false },
  });
}

export async function getStreamingConnections(
  userId: string
): Promise<StreamingConnection[]> {
  const connections = await prisma.streamingConnection.findMany({
    where: { userId, isActive: true },
  });
  return connections as StreamingConnection[];
}

// ── Sync listening data ──────────────────────────────────────────────────────

export async function syncStreamingData(
  userId: string,
  platform: StreamingPlatform,
  listeningData: StreamingListeningData
): Promise<SyncResult> {
  const connection = await prisma.streamingConnection.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!connection || !connection.isActive) {
    throw new Error(`No active ${platform} connection found`);
  }

  // 1. Extract and map genres
  const allMusicGenres = [
    ...listeningData.topArtists.flatMap((a) => a.genres),
    ...listeningData.topGenres.map((g) => g.genre),
  ];
  const comedyGenreScores = mapMusicGenresToComedyGenres(allMusicGenres);

  // 2. Find comedy-specific content
  const comedyArtists = listeningData.topArtists.filter((a) =>
    a.genres.some((g) => g.toLowerCase().includes("comedy"))
  );

  // 3. Match comedy album artists to comedians in our DB
  const comedianMatches: SyncResult["comedianMatches"] = [];

  // Match by comedy album artists
  for (const album of listeningData.comedyAlbums) {
    const comedian = await prisma.comedian.findFirst({
      where: { name: { contains: album.artistName, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (comedian) {
      comedianMatches.push({
        comedianId: comedian.id,
        comedianName: comedian.name,
        matchReason: `Listens to "${album.albumName}"`,
        confidence: 0.9,
      });
    }
  }

  // Match by top artists tagged as comedy
  for (const artist of comedyArtists) {
    const comedian = await prisma.comedian.findFirst({
      where: { name: { contains: artist.name, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (comedian && !comedianMatches.some((m) => m.comedianId === comedian.id)) {
      comedianMatches.push({
        comedianId: comedian.id,
        comedianName: comedian.name,
        matchReason: "Top streaming artist",
        confidence: 0.85,
      });
    }
  }

  // 4. Store streaming genre signals for taste profile enrichment
  await prisma.streamingGenreSignal.deleteMany({
    where: { userId, platform },
  });

  const genreEntries = Object.entries(comedyGenreScores);
  if (genreEntries.length > 0) {
    await prisma.streamingGenreSignal.createMany({
      data: genreEntries.map(([genre, weight]) => ({
        userId,
        platform,
        genre,
        weight,
      })),
    });
  }

  // 5. Update taste profile with streaming data
  let tasteProfileUpdated = false;
  try {
    const existingProfile = await prisma.tasteProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      const existingDimensions = JSON.parse(existingProfile.dimensions) as Record<string, number>;
      // Merge streaming signals (30% weight) with existing profile (70% weight)
      for (const [genre, score] of genreEntries) {
        const existing = existingDimensions[genre] || 0;
        existingDimensions[genre] = Math.round((existing * 0.7 + score * 0.3) * 100) / 100;
      }

      const topGenres = Object.entries(existingDimensions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g]) => g);

      await prisma.tasteProfile.update({
        where: { userId },
        data: {
          dimensions: JSON.stringify(existingDimensions),
          topGenres: JSON.stringify(topGenres),
          confidence: Math.min(existingProfile.confidence + 0.1, 1),
          lastComputed: new Date(),
        },
      });
      tasteProfileUpdated = true;
    }
  } catch {
    // Taste profile update is best-effort
  }

  // 6. Update sync timestamp
  await prisma.streamingConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  });

  return {
    connection: { ...connection, lastSyncedAt: new Date() } as StreamingConnection,
    genresImported: genreEntries.length,
    comedianMatches,
    tasteProfileUpdated,
  };
}

// ── Get streaming-based recommendations ──────────────────────────────────────

export async function getStreamingBasedRecommendations(
  userId: string,
  limit = 10
): Promise<
  Array<{
    comedianId: string;
    comedianName: string;
    slug: string;
    headshotUrl: string | null;
    matchScore: number;
    matchReasons: string[];
    genres: string[];
  }>
> {
  // Get user's streaming genre signals
  const signals = await prisma.streamingGenreSignal.findMany({
    where: { userId },
    orderBy: { weight: "desc" },
  });

  if (signals.length === 0) return [];

  // Get already-followed comedian IDs
  const followedIds = await prisma.comedianFollow
    .findMany({ where: { userId }, select: { comedianId: true } })
    .then((rows) => new Set(rows.map((r) => r.comedianId)));

  // Find comedians matching streaming-derived genres
  const topGenres = signals.slice(0, 5).map((s) => s.genre);
  const candidates = await prisma.comedian.findMany({
    where: {
      id: { notIn: Array.from(followedIds) },
      genres: { some: { genre: { in: topGenres, mode: "insensitive" } } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      headshotUrl: true,
      genres: { select: { genre: true } },
      _count: { select: { followers: true } },
    },
    take: limit * 3,
  });

  const genreWeightMap = new Map(signals.map((s) => [s.genre.toLowerCase(), s.weight]));

  const scored = candidates.map((c) => {
    let matchScore = 0;
    const matchReasons: string[] = [];
    const matchingGenres: string[] = [];

    for (const g of c.genres) {
      const weight = genreWeightMap.get(g.genre.toLowerCase()) ?? 0;
      if (weight > 0) {
        matchScore += weight;
        matchingGenres.push(g.genre);
      }
    }

    if (matchingGenres.length > 0) {
      matchReasons.push(`Matches your streaming taste: ${matchingGenres.join(", ")}`);
    }

    // Popularity boost
    matchScore += Math.min(c._count.followers * 0.01, 1);

    return {
      comedianId: c.id,
      comedianName: c.name,
      slug: c.slug,
      headshotUrl: c.headshotUrl,
      matchScore: Math.round(matchScore * 100) / 100,
      matchReasons,
      genres: c.genres.map((g) => g.genre),
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
