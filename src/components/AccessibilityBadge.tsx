"use client";

import { useState } from "react";

const ACCESSIBILITY_ICONS: Record<string, { icon: string; label: string }> = {
  asl_interpreted: { icon: "\u{1F91F}", label: "ASL Interpreted" },
  captioned: { icon: "CC", label: "Captioned" },
  audio_described: { icon: "\u{1F50A}", label: "Audio Described" },
  sensory_friendly: { icon: "\u{1F31F}", label: "Sensory Friendly" },
  wheelchair: { icon: "\u267F", label: "Wheelchair Accessible" },
  hearing_loop: { icon: "\u{1F442}", label: "Hearing Loop" },
  large_print: { icon: "\u{1F524}", label: "Large Print" },
  service_animal: { icon: "\u{1F9AE}", label: "Service Animal Welcome" },
};

interface AccessibilityBadgeProps {
  type: string;
  description?: string | null;
  verified?: boolean;
  expanded?: boolean;
  className?: string;
}

export function AccessibilityBadge({
  type,
  description,
  verified = false,
  expanded = false,
  className = "",
}: AccessibilityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = ACCESSIBILITY_ICONS[type] ?? { icon: "?", label: type };

  if (expanded) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 ${className}`}
        role="status"
        aria-label={`${config.label}${verified ? " (verified)" : ""}`}
      >
        <span className="text-lg" aria-hidden="true">
          {config.icon}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            {config.label}
          </span>
          {description && (
            <span className="text-xs text-gray-400">{description}</span>
          )}
        </div>
        {verified && (
          <span
            className="ml-auto rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-400"
            aria-label="Verified"
          >
            Verified
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-white ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="status"
      aria-label={`${config.label}${verified ? " (verified)" : ""}${description ? `: ${description}` : ""}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {verified && (
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden="true" />
      )}

      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
          role="tooltip"
        >
          {config.label}
          {verified && " \u2713"}
          {description && (
            <>
              <br />
              <span className="text-gray-400">{description}</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
