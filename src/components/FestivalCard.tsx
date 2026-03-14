"use client";

interface Festival {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  startDate?: string | null;
  endDate?: string | null;
  category: string;
  showCount: number;
  attendeeCapacity?: number | null;
  website?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  standup: "bg-blue-900 text-blue-300",
  improv: "bg-green-900 text-green-300",
  sketch: "bg-yellow-900 text-yellow-300",
  variety: "bg-pink-900 text-pink-300",
  fringe: "bg-purple-900 text-purple-300",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FestivalCard({ festival }: { festival: Festival }) {
  const categoryClass =
    CATEGORY_COLORS[festival.category] || "bg-gray-700 text-gray-300";

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-amber-500 transition-colors">
      {festival.imageUrl && (
        <div
          className="h-32 rounded-lg bg-cover bg-center mb-4"
          style={{ backgroundImage: `url(${festival.imageUrl})` }}
        />
      )}

      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">{festival.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${categoryClass}`}>
          {festival.category}
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-2">
        {festival.city}, {festival.country}
      </p>

      {(festival.startDate || festival.endDate) && (
        <p className="text-sm text-amber-400 mb-3">
          {festival.startDate && formatDate(festival.startDate)}
          {festival.startDate && festival.endDate && " - "}
          {festival.endDate && formatDate(festival.endDate)}
        </p>
      )}

      {festival.description && (
        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
          {festival.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {festival.showCount > 0 && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
            {festival.showCount} shows
          </span>
        )}
        {festival.attendeeCapacity && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
            {festival.attendeeCapacity.toLocaleString()} capacity
          </span>
        )}
      </div>

      {festival.website && (
        <a
          href={festival.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-400 hover:text-amber-300 font-medium"
        >
          Visit website &rarr;
        </a>
      )}
    </div>
  );
}
