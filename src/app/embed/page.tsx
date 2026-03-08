import Link from "next/link";

export const metadata = {
  title: "Embed Widgets | Punchline Atlas",
  description: "Embed Punchline Atlas comedian, venue, and event cards on your website.",
};

export default function EmbedPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-3">Embed Widgets</h1>
        <p className="text-zinc-400 mb-8">
          Embed Punchline Atlas cards on your website, blog, or social bio. Share comedian profiles,
          venue info, and upcoming shows with a simple code snippet.
        </p>

        {/* Comedian Embed */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Comedian Card</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Embed a comedian&apos;s profile card with followers, genres, and touring status.
          </p>
          <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
            <p className="text-zinc-300 text-xs font-mono mb-2">HTML</p>
            <code className="block text-sm text-brand-gold bg-brand-charcoal p-3 rounded overflow-x-auto">
              {`<iframe src="https://punchlineatlas.com/api/embed?type=comedian&slug=YOUR_SLUG&format=html" width="420" height="100" frameborder="0"></iframe>`}
            </code>
          </div>
        </section>

        {/* Venue Embed */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Venue Card</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Embed a venue card with location, capacity, and follower count.
          </p>
          <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
            <p className="text-zinc-300 text-xs font-mono mb-2">HTML</p>
            <code className="block text-sm text-brand-gold bg-brand-charcoal p-3 rounded overflow-x-auto">
              {`<iframe src="https://punchlineatlas.com/api/embed?type=venue&id=YOUR_VENUE_ID&format=html" width="420" height="90" frameborder="0"></iframe>`}
            </code>
          </div>
        </section>

        {/* Event Embed */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Event Card</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Embed an event card with lineup, venue, date, and ticket link.
          </p>
          <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
            <p className="text-zinc-300 text-xs font-mono mb-2">HTML</p>
            <code className="block text-sm text-brand-gold bg-brand-charcoal p-3 rounded overflow-x-auto">
              {`<iframe src="https://punchlineatlas.com/api/embed?type=event&id=YOUR_EVENT_ID&format=html" width="420" height="120" frameborder="0"></iframe>`}
            </code>
          </div>
        </section>

        {/* JSON API */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">JSON API</h2>
          <p className="text-zinc-400 text-sm mb-4">
            For custom integrations, use the JSON format to build your own widgets.
          </p>
          <div className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
            <p className="text-zinc-300 text-xs font-mono mb-2">Endpoint</p>
            <code className="block text-sm text-brand-gold bg-brand-charcoal p-3 rounded overflow-x-auto">
              GET /api/embed?type=comedian&slug=YOUR_SLUG&format=json
            </code>
          </div>
        </section>

        <div className="text-center text-zinc-500 text-sm">
          <p>Need help? Contact <a href="mailto:dev@punchlineatlas.com" className="text-brand-gold hover:underline">dev@punchlineatlas.com</a></p>
          <p className="mt-2">
            <Link href="/comedians" className="text-zinc-400 hover:text-brand-gold">Browse comedians</Link>
            {" · "}
            <Link href="/venues" className="text-zinc-400 hover:text-brand-gold">Browse venues</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
