"use client";

import { useState } from "react";
import VenueFloorPlan from "@/components/VenueFloorPlan";
import VenuePOSDashboard from "@/components/VenuePOSDashboard";
import VenueEventManager from "@/components/VenueEventManager";
import BookingManager from "@/components/BookingManager";

const TABS = [
  { key: "events", label: "Events & Analytics" },
  { key: "floor-plan", label: "Floor Plan" },
  { key: "pos", label: "POS Dashboard" },
  { key: "bookings", label: "Bookings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function VenueOpsTabs({ venueId }: { venueId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("events");

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-brand-gold text-brand-gold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "events" && <VenueEventManager venueId={venueId} />}

      {activeTab === "floor-plan" && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Design and manage your venue floor plans. Click cells to place seat
            types and save layouts for different event configurations.
          </p>
          <VenueFloorPlan venueId={venueId} />
        </div>
      )}

      {activeTab === "pos" && <VenuePOSDashboard venueId={venueId} />}

      {activeTab === "bookings" && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            View and manage booking requests from comedians. Accept, decline, or
            negotiate terms for upcoming shows.
          </p>
          <BookingManager role="venue" entityId={venueId} />
        </div>
      )}
    </div>
  );
}
