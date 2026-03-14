"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type ClipCardProps = {
  id: string;
  title?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration: number;
  comedian?: { id: string; name: string; slug: string } | null;
  likeCount: number;
  shareCount: number;
  commentCount: number;
  eventId?: string | null;
  duetCount?: number;
  userLiked?: boolean;
  userSaved?: boolean;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ClipCard({
  id,
  title,
  thumbnailUrl,
  duration,
  comedian,
  likeCount: initialLikeCount,
  shareCount,
  commentCount,
  eventId,
  duetCount = 0,
  userLiked = false,
  userSaved = false,
}: ClipCardProps) {
  const [liked, setLiked] = useState(userLiked);
  const [saved, setSaved] = useState(userSaved);
  const [likes, setLikes] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  const handleEngage = async (type: "like" | "save") => {
    if (loading) return;
    setLoading(true);

    const isActive = type === "like" ? liked : saved;
    const method = isActive ? "DELETE" : "POST";

    // Optimistic update
    if (type === "like") {
      setLiked(!liked);
      setLikes((prev) => prev + (isActive ? -1 : 1));
    } else {
      setSaved(!saved);
    }

    try {
      const res = await fetch(`/api/clips/${id}/engage`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        // Revert optimistic update
        if (type === "like") {
          setLiked(isActive);
          setLikes((prev) => prev + (isActive ? 1 : -1));
        } else {
          setSaved(isActive);
        }
      }
    } catch {
      // Revert optimistic update
      if (type === "like") {
        setLiked(isActive);
        setLikes((prev) => prev + (isActive ? 1 : -1));
      } else {
        setSaved(isActive);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/clips?clip=${id}`
      );
      await fetch(`/api/clips/${id}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "share" }),
      });
    } catch {
      // Sharing failed silently
    }
  };

  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
      {/* Video thumbnail */}
      <Link href={`/clips?clip=${id}`} className="relative aspect-[9/16] bg-zinc-800 block overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title ?? "Comedy clip"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 bg-black/75 text-white text-xs font-medium px-1.5 py-0.5 rounded">
          {formatDuration(duration)}
        </span>

        {/* Duet count badge */}
        {duetCount > 0 && (
          <span className="absolute top-2 right-2 bg-brand-gold/90 text-brand-dark text-xs font-bold px-1.5 py-0.5 rounded">
            {duetCount} duet{duetCount !== 1 ? "s" : ""}
          </span>
        )}
      </Link>

      {/* Info section */}
      <div className="p-3 flex flex-col gap-2">
        {title && (
          <p className="text-sm font-medium text-white line-clamp-2">{title}</p>
        )}

        {/* Comedian name */}
        {comedian && (
          <Link
            href={`/comedians/${comedian.slug}`}
            className="text-xs text-zinc-400 hover:text-brand-gold transition-colors truncate"
          >
            {comedian.name}
          </Link>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleEngage("like")}
            disabled={loading}
            className={`flex items-center gap-1 text-xs transition-colors ${
              liked ? "text-red-500" : "text-zinc-400 hover:text-red-500"
            }`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill={liked ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{likes}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-400 transition-colors"
            aria-label="Share"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>{shareCount}</span>
          </button>

          <button
            type="button"
            onClick={() => handleEngage("save")}
            disabled={loading}
            className={`flex items-center gap-1 text-xs transition-colors ${
              saved ? "text-brand-gold" : "text-zinc-400 hover:text-brand-gold"
            }`}
            aria-label={saved ? "Unsave" : "Save"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill={saved ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>

          {commentCount > 0 && (
            <span className="text-xs text-zinc-500 ml-auto">
              {commentCount} comment{commentCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Watch Show CTA */}
        {eventId && (
          <Link
            href={`/events/${eventId}`}
            className="mt-1 text-center text-xs font-semibold bg-brand-gold text-brand-dark rounded-md py-1.5 hover:bg-brand-gold/90 transition-colors"
          >
            Watch Show
          </Link>
        )}
      </div>
    </div>
  );
}
