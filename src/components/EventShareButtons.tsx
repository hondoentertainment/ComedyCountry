"use client";

import { useState } from "react";

type EventShareButtonsProps = {
  title: string;
  url: string;
  venueName?: string;
};

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const buttonClass =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark";

export function EventShareButtons({ title, url, venueName }: EventShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareText = venueName ? `${title} at ${venueName}` : title;

  const handleNativeShare = async () => {
    if (typeof navigator?.share !== "function") return;
    try {
      await navigator.share({
        title,
        text: shareText,
        url,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        fallbackCopy(url);
      }
    }
  };

  const fallbackCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleCopy = () => fallbackCopy(url);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-400 mr-1">Share:</span>
      {hasNativeShare ? (
        <button
          type="button"
          onClick={handleNativeShare}
          className={buttonClass}
          aria-label="Share event"
        >
          <ShareIcon className="w-4 h-4" />
          Share
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={handleCopy}
            className={buttonClass}
            aria-label="Copy link"
          >
            <CopyIcon className="w-4 h-4" />
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
            aria-label="Share on X (Twitter)"
          >
            <TwitterIcon className="w-4 h-4" />
            X
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass}
            aria-label="Share on Facebook"
          >
            <FacebookIcon className="w-4 h-4" />
            Facebook
          </a>
        </>
      )}
    </div>
  );
}
