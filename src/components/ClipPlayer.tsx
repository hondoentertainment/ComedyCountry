"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export type ClipPlayerProps = {
  id: string;
  title?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration: number;
  description?: string | null;
  comedian?: { id: string; name: string; slug: string } | null;
  likeCount: number;
  shareCount: number;
  commentCount: number;
  viewCount?: number;
  eventId?: string | null;
  tags?: string[];
  userLiked?: boolean;
  userSaved?: boolean;
  autoPlay?: boolean;
  onEnded?: () => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ClipPlayer({
  id,
  title,
  videoUrl,
  thumbnailUrl,
  duration,
  description,
  comedian,
  likeCount: initialLikeCount,
  shareCount: initialShareCount,
  commentCount,
  viewCount = 0,
  eventId,
  tags = [],
  userLiked = false,
  userSaved = false,
  autoPlay = false,
  onEnded,
}: ClipPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [liked, setLiked] = useState(userLiked);
  const [saved, setSaved] = useState(userSaved);
  const [likes, setLikes] = useState(initialLikeCount);
  const [shares, setShares] = useState(initialShareCount);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  // Track view
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/clips/${id}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "view" }),
      }).catch((err) => {
        logger.error(
          "ClipPlayer view tracking failed",
          {},
          err instanceof Error ? err : undefined,
        );
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [id]);

  // Auto-play when prop changes
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }, [autoPlay]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  }, [playing]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration;
    setCurrentTime(ct);
    setProgress((ct / dur) * 100);
  }, [duration]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!videoRef.current || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const dur = videoRef.current.duration || duration;
      videoRef.current.currentTime = ratio * dur;
    },
    [duration],
  );

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
        if (type === "like") {
          setLiked(isActive);
          setLikes((prev) => prev + (isActive ? 1 : -1));
        } else {
          setSaved(isActive);
        }
      }
    } catch {
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
      const url = `${window.location.origin}/clips?clip=${id}`;
      if (navigator.share) {
        await navigator.share({ title: title ?? "Comedy Clip", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      await fetch(`/api/clips/${id}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "share" }),
      });
      setShares((prev) => prev + 1);
    } catch {
      // share failed silently
    }
  };

  const handleVideoEnded = useCallback(() => {
    setPlaying(false);
    onEnded?.();
  }, [onEnded]);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        className="h-full w-full object-contain"
        loop={false}
        muted={muted}
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Play/pause overlay */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          aria-label="Play"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="ml-1 h-8 w-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="absolute bottom-0 left-0 right-0 h-1 cursor-pointer bg-white/20"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-brand-gold transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <div className="absolute bottom-2 left-3 text-xs text-white/70">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Mute button */}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-2 right-3 rounded-full bg-black/40 p-1.5 text-white/80 hover:text-white transition-colors"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
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
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
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
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        )}
      </button>

      {/* Right-side engagement buttons (TikTok-style) */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
        {/* Comedian avatar */}
        {comedian && (
          <Link
            href={`/comedians/${comedian.slug}`}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-zinc-700 text-sm font-bold text-white">
              {comedian.name.charAt(0).toUpperCase()}
            </div>
          </Link>
        )}

        {/* Like */}
        <button
          type="button"
          onClick={() => handleEngage("like")}
          disabled={loading}
          className="flex flex-col items-center gap-1"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              liked
                ? "bg-red-500/20 text-red-500"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
          </div>
          <span className="text-xs font-medium text-white">
            {formatCount(likes)}
          </span>
        </button>

        {/* Comment */}
        <Link
          href={`/clips?clip=${id}#comments`}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <span className="text-xs font-medium text-white">
            {formatCount(commentCount)}
          </span>
        </Link>

        {/* Share */}
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
          aria-label="Share"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
          </div>
          <span className="text-xs font-medium text-white">
            {formatCount(shares)}
          </span>
        </button>

        {/* Save */}
        <button
          type="button"
          onClick={() => handleEngage("save")}
          disabled={loading}
          className="flex flex-col items-center gap-1"
          aria-label={saved ? "Unsave" : "Save"}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              saved
                ? "bg-brand-gold/20 text-brand-gold"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
          </div>
        </button>
      </div>

      {/* Bottom info overlay */}
      <div className="absolute bottom-6 left-3 right-16 space-y-2">
        {/* Comedian name */}
        {comedian && (
          <Link
            href={`/comedians/${comedian.slug}`}
            className="text-sm font-bold text-white hover:underline"
          >
            @{comedian.name}
          </Link>
        )}

        {/* Title */}
        {title && (
          <p className="text-sm font-medium text-white leading-snug">{title}</p>
        )}

        {/* Description (collapsible) */}
        {description && (
          <div>
            <p
              className={`text-xs text-white/80 leading-relaxed ${
                showDescription ? "" : "line-clamp-2"
              }`}
            >
              {description}
            </p>
            {description.length > 100 && (
              <button
                type="button"
                onClick={() => setShowDescription(!showDescription)}
                className="text-xs font-medium text-white/60 hover:text-white mt-0.5"
              >
                {showDescription ? "less" : "more"}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 5).map((tag) => (
              <Link
                key={tag}
                href={`/clips?tags=${encodeURIComponent(tag)}`}
                className="text-xs font-medium text-brand-gold hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* View count */}
        {viewCount > 0 && (
          <p className="text-xs text-white/50">
            {formatCount(viewCount)} views
          </p>
        )}

        {/* Watch Show CTA */}
        {eventId && (
          <Link
            href={`/events/${eventId}`}
            className="inline-block rounded-full bg-brand-gold px-4 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-gold/90 transition-colors"
          >
            Watch Full Show
          </Link>
        )}
      </div>
    </div>
  );
}
