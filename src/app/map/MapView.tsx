"use client";

import nextDynamic from "next/dynamic";
import type { MapPageContentProps } from "@/components/MapPageContent";

const MapPageContent = nextDynamic(
  () =>
    import("@/components/MapPageContent").then((m) => ({
      default: m.MapPageContent,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
        Loading map…
      </div>
    ),
  }
);

export function MapView(props: MapPageContentProps) {
  return <MapPageContent {...props} />;
}
