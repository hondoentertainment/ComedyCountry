"use client";

import { useState, useCallback } from "react";

const ACCESSIBILITY_OPTIONS = [
  { value: "asl_interpreted", label: "ASL Interpreted", icon: "\u{1F91F}" },
  { value: "captioned", label: "Captioned", icon: "CC" },
  { value: "audio_described", label: "Audio Described", icon: "\u{1F50A}" },
  { value: "sensory_friendly", label: "Sensory Friendly", icon: "\u{1F31F}" },
  { value: "wheelchair", label: "Wheelchair Accessible", icon: "\u267F" },
  { value: "hearing_loop", label: "Hearing Loop", icon: "\u{1F442}" },
  { value: "large_print", label: "Large Print", icon: "\u{1F524}" },
  { value: "service_animal", label: "Service Animal Welcome", icon: "\u{1F9AE}" },
] as const;

interface AccessibilityFilterProps {
  onChange: (selectedTypes: string[]) => void;
  matchCount?: number;
  className?: string;
}

export function AccessibilityFilter({
  onChange,
  matchCount,
  className = "",
}: AccessibilityFilterProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showOnlyAccessible, setShowOnlyAccessible] = useState(false);

  const toggleType = useCallback(
    (type: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        onChange(Array.from(next));
        return next;
      });
    },
    [onChange],
  );

  const handleToggleAccessible = useCallback(
    (checked: boolean) => {
      setShowOnlyAccessible(checked);
      if (!checked) {
        setSelected(new Set());
        onChange([]);
      } else {
        onChange(Array.from(selected));
      }
    },
    [onChange, selected],
  );

  return (
    <div
      className={`rounded-lg border border-gray-700 bg-gray-800 p-4 ${className}`}
      role="region"
      aria-label="Accessibility filters"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Accessibility Features
        </h3>
        {matchCount !== undefined && (
          <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-medium text-brand-gold">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      <label className="mb-3 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={showOnlyAccessible}
          onChange={(e) => handleToggleAccessible(e.target.checked)}
          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-gold focus:ring-brand-gold"
        />
        <span className="text-sm text-gray-300">
          Show only accessible events
        </span>
      </label>

      <div className="space-y-2">
        {ACCESSIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-700/50"
          >
            <input
              type="checkbox"
              checked={selected.has(option.value)}
              onChange={() => toggleType(option.value)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-gold focus:ring-brand-gold"
            />
            <span className="text-sm" aria-hidden="true">
              {option.icon}
            </span>
            <span className="text-sm text-gray-300">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
