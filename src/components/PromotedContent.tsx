"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface Promotion {
  id: string;
  type: string;
  headline: string | null;
  venue: { id: string; name: string; city: string; state: string } | null;
  event: { id: string; title: string | null; venue: { name: string }; comedians: Array<{ comedian: { name: string; slug: string } }> } | null;
  comedian: { id: string; name: string; slug: string; headshotUrl: string | null } | null;
}

export function PromotedContent({ type, className }: { type: string; className?: string }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    fetch(`/api/promoted?type=${type}&limit=2`)
      .then((r) => r.json())
      .then((d) => setPromotions(d.promotions || []))
      .catch((err) => {
        console.error('PromotedContent fetch failed:', err);
      });
  }, [type]);

  if (promotions.length === 0) return null;

  return (
    <div className={className}>
      {promotions.map((promo) => (
        <div key={promo.id} className="relative">
          <span className="absolute top-2 right-2 text-[10px] text-zinc-600 uppercase tracking-wider">Promoted</span>
          {promo.comedian && (
            <Link
              href={`/comedians/${promo.comedian.slug}`}
              className="block p-4 rounded-lg bg-gradient-to-r from-brand-gold/5 to-transparent border border-brand-gold/20 hover:border-brand-gold/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                {promo.comedian.headshotUrl && (
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 relative">
                    <Image src={promo.comedian.headshotUrl} alt={promo.comedian.name} fill className="object-cover" sizes="48px" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{promo.headline || promo.comedian.name}</p>
                  <p className="text-zinc-500 text-xs">Sponsored comedian</p>
                </div>
              </div>
            </Link>
          )}
          {promo.venue && (
            <Link
              href={`/venues/${promo.venue.id}`}
              className="block p-4 rounded-lg bg-gradient-to-r from-brand-gold/5 to-transparent border border-brand-gold/20 hover:border-brand-gold/40 transition-colors"
            >
              <p className="text-white font-medium">{promo.headline || promo.venue.name}</p>
              <p className="text-zinc-500 text-xs">{promo.venue.city}, {promo.venue.state} &middot; Sponsored venue</p>
            </Link>
          )}
          {promo.event && (
            <Link
              href={`/events/${promo.event.id}`}
              className="block p-4 rounded-lg bg-gradient-to-r from-brand-gold/5 to-transparent border border-brand-gold/20 hover:border-brand-gold/40 transition-colors"
            >
              <p className="text-white font-medium">
                {promo.headline || promo.event.title || promo.event.comedians.map((ec) => ec.comedian.name).join(", ")}
              </p>
              <p className="text-zinc-500 text-xs">{promo.event.venue.name} &middot; Sponsored event</p>
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
