"use client";

import { useState, useRef, useCallback } from "react";

interface ClipUploaderProps {
  comedianId?: string;
  eventId?: string;
  onSuccess?: (clip: { id: string; videoUrl: string; title: string | null }) => void;
  onCancel?: () => void;
}

export default function ClipUploader({
  comedianId,
  eventId,
  onSuccess,
  onCancel,
}: ClipUploaderProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number | "">("");
  const [tags, setTags] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const handleVideoUrlChange = useCallback((url: string) => {
    setVideoUrl(url);
    setPreviewLoaded(false);
    setDuration("");
  }, []);

  const handleVideoLoad = useCallback(() => {
    if (videoPreviewRef.current) {
      const dur = Math.round(videoPreviewRef.current.duration);
      if (dur > 0 && dur <= 90) {
        setDuration(dur);
      }
      setPreviewLoaded(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!videoUrl.trim()) {
      setError("Video URL is required");
      return;
    }
    if (!duration || Number(duration) <= 0) {
      setError("Duration must be a positive number");
      return;
    }
    if (Number(duration) > 90) {
      setError("Clips must be 90 seconds or less");
      return;
    }

    setSubmitting(true);

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch("/api/clips/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoUrl.trim(),
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          duration: Number(duration),
          tags: tagList.length > 0 ? tagList : undefined,
          comedianId: comedianId || undefined,
          eventId: eventId || undefined,
          isPreview,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const clip = await res.json();
      setSuccess(true);
      onSuccess?.(clip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload clip");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-green-800/50 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-white font-semibold mb-1">Clip Uploaded</h3>
        <p className="text-zinc-400 text-sm">Your clip is being processed and will appear in the feed shortly.</p>
        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={() => {
              setSuccess(false);
              setVideoUrl("");
              setThumbnailUrl("");
              setTitle("");
              setDescription("");
              setDuration("");
              setTags("");
              setIsPreview(false);
              setPreviewLoaded(false);
            }}
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90"
          >
            Upload Another
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-800/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Video URL and preview */}
      <div>
        <label htmlFor="clip-url" className="block text-sm text-zinc-400 mb-1">
          Video URL *
        </label>
        <input
          id="clip-url"
          value={videoUrl}
          onChange={(e) => handleVideoUrlChange(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
          placeholder="https://..."
        />
        <p className="text-zinc-600 text-xs mt-0.5">
          Direct link to your video file (MP4, WebM). Max 90 seconds.
        </p>
      </div>

      {/* Video preview */}
      {videoUrl && (
        <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-sm">
          <video
            ref={videoPreviewRef}
            src={videoUrl}
            onLoadedMetadata={handleVideoLoad}
            onError={() => setPreviewLoaded(false)}
            controls
            preload="metadata"
            className="w-full h-full object-contain"
          />
          {!previewLoaded && (
            <p className="text-zinc-500 text-xs text-center py-2">
              Preview will load when a valid video URL is provided.
            </p>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="clip-title" className="block text-sm text-zinc-400 mb-1">
          Title
        </label>
        <input
          id="clip-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
          placeholder="Give your clip a title..."
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="clip-desc" className="block text-sm text-zinc-400 mb-1">
          Description
        </label>
        <textarea
          id="clip-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={2000}
          className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none resize-none"
          placeholder="Describe your clip..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Duration */}
        <div>
          <label htmlFor="clip-duration" className="block text-sm text-zinc-400 mb-1">
            Duration (seconds) *
          </label>
          <input
            id="clip-duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value, 10) : "")}
            required
            min={1}
            max={90}
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            placeholder="60"
          />
        </div>

        {/* Thumbnail URL */}
        <div>
          <label htmlFor="clip-thumb" className="block text-sm text-zinc-400 mb-1">
            Thumbnail URL
          </label>
          <input
            id="clip-thumb"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="clip-tags" className="block text-sm text-zinc-400 mb-1">
          Tags
        </label>
        <input
          id="clip-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-zinc-700 text-white focus:border-brand-gold focus:outline-none"
          placeholder="standup, crowdwork, darkhumor (comma separated)"
        />
        <p className="text-zinc-600 text-xs mt-0.5">Max 10 tags, comma separated</p>
      </div>

      {/* Options */}
      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
        <input
          type="checkbox"
          checked={isPreview}
          onChange={(e) => setIsPreview(e.target.checked)}
          className="rounded border-zinc-700 bg-brand-dark text-brand-gold focus:ring-brand-gold"
        />
        This is a show preview clip
      </label>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !videoUrl || !duration}
          className="flex-1 px-6 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Uploading..." : "Upload Clip"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
