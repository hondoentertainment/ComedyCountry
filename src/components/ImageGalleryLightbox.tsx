"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";

type Photo = { id: string; url: string; caption: string | null };

type ImageGalleryLightboxProps = {
  photos: Photo[];
  venueName: string;
};

export function ImageGalleryLightbox({ photos, venueName }: ImageGalleryLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const goPrev = useCallback(() => {
    if (openIndex === null) return;
    setOpenIndex((prev) => (prev === null ? null : prev === 0 ? photos.length - 1 : prev - 1));
  }, [openIndex, photos.length]);

  const goNext = useCallback(() => {
    if (openIndex === null) return;
    setOpenIndex((prev) => (prev === null ? null : (prev + 1) % photos.length));
  }, [openIndex, photos.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openIndex, goPrev, goNext]);

  useEffect(() => {
    if (openIndex !== null) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [openIndex]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="block aspect-video rounded-lg overflow-hidden bg-zinc-800 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark"
            aria-label={`View photo ${index + 1} of ${photos.length}`}
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? venueName}
              width={400}
              height={225}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-gold"
              aria-label="Close gallery"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  aria-label="Previous photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  aria-label="Next photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <div className="relative w-full max-w-4xl h-[80vh]">
              <Image
                src={photos[openIndex].url}
                alt={photos[openIndex].caption ?? venueName}
                fill
                className="object-contain"
                sizes="95vw"
                priority
              />
            </div>

            {(photos[openIndex].caption || photos.length > 1) && (
              <div className="absolute bottom-4 left-0 right-0 text-center px-4">
                {photos[openIndex].caption && (
                  <p className="text-white text-sm sm:text-base">{photos[openIndex].caption}</p>
                )}
                {photos.length > 1 && (
                  <p className="text-zinc-400 text-sm mt-1">
                    {openIndex + 1} / {photos.length}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
