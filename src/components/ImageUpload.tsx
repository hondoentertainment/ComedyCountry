"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

interface ImageUploadProps {
  onUploaded?: (url: string) => void;
  entityType?: string;
  entityId?: string;
  className?: string;
  currentImage?: string | null;
}

export function ImageUpload({ onUploaded, entityType, entityId, className, currentImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      if (entityType) formData.append("entityType", entityType);
      if (entityId) formData.append("entityId", entityId);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Upload failed");
          return;
        }

        setPreview(data.url);
        onUploaded?.(data.url);
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [entityType, entityId, onUploaded],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative w-full aspect-[4/3] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-brand-surface cursor-pointer transition-colors overflow-hidden flex items-center justify-center"
      >
        {preview ? (
          <Image src={preview} alt="Upload preview" fill className="object-cover" sizes="400px" />
        ) : (
          <div className="text-center text-zinc-500 p-4">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Click to upload image</p>
            <p className="text-xs mt-1">JPEG, PNG, WebP up to 5MB</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
