"use client";

import { useEffect, useState } from "react";

interface ContentItem {
  id: string;
  title: string;
  body: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  embedUrl: string | null;
  isGated: boolean;
  publishedAt: string;
}

interface ExclusiveContentFeedProps {
  comedianId: string;
  limit?: number;
}

export default function ExclusiveContentFeed({ comedianId, limit = 10 }: ExclusiveContentFeedProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/creator/content?comedianId=${comedianId}&limit=${limit}`);
        if (res.ok) {
          setItems(await res.json());
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [comedianId, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg bg-brand-surface border border-zinc-800 animate-pulse">
            <div className="h-4 bg-zinc-800 rounded w-2/3 mb-2" />
            <div className="h-3 bg-zinc-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800 text-center">
        <p className="text-zinc-500 text-sm">No exclusive content yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="p-5 rounded-lg bg-brand-surface border border-zinc-800">
          <div className="flex items-start justify-between">
            <h3 className="text-white font-semibold">
              {item.title}
              {item.isGated && (
                <span className="ml-2 text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded">
                  Subscribers Only
                </span>
              )}
            </h3>
            <span className="text-zinc-600 text-xs whitespace-nowrap ml-4">
              {new Date(item.publishedAt).toLocaleDateString()}
            </span>
          </div>

          {item.isGated && !item.body ? (
            <div className="mt-3 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 text-center">
              <p className="text-zinc-500 text-sm">
                This content is for subscribers only.
              </p>
            </div>
          ) : (
            <>
              {item.body && (
                <p className="text-zinc-300 text-sm mt-3 whitespace-pre-wrap line-clamp-4">
                  {item.body}
                </p>
              )}

              {item.embedUrl && (
                <div className="mt-3 aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={item.embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={item.title}
                  />
                </div>
              )}

              {item.mediaUrl && item.mediaType === "image" && (
                <img
                  src={item.mediaUrl}
                  alt={item.title}
                  className="mt-3 rounded-lg max-h-80 object-cover w-full"
                />
              )}

              {item.mediaUrl && item.mediaType === "video" && (
                <video
                  src={item.mediaUrl}
                  controls
                  className="mt-3 rounded-lg max-h-80 w-full"
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
