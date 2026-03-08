"use client";

type Props = {
  eventId: string;
  title: string;
  date: string;
  venue: string;
  location: string;
};

export function CalendarExport({ eventId, title, date, venue, location }: Props) {
  const eventDate = new Date(date);
  const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

  const formatGoogleDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGoogleDate(eventDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent(`${title} at ${venue}`)}&location=${encodeURIComponent(location)}`;

  return (
    <div className="flex gap-2">
      <a
        href={`/api/events/${eventId}/calendar`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-medium transition-colors border border-zinc-700"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        iCal
      </a>
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-medium transition-colors border border-zinc-700"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 3.5h-2V2.25a.75.75 0 00-1.5 0V3.5h-8V2.25a.75.75 0 00-1.5 0V3.5h-2A2.5 2.5 0 002 6v13.5A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5V6a2.5 2.5 0 00-2.5-2.5zM20.5 19.5a1 1 0 01-1 1h-15a1 1 0 01-1-1V9h17v10.5z" />
        </svg>
        Google Calendar
      </a>
    </div>
  );
}
