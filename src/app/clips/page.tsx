import { Metadata } from "next";
import { ClipFeed } from "@/components/ClipFeed";

export const metadata: Metadata = {
  title: "Comedy Clips | Punchline Atlas",
  description:
    "Discover short-form comedy clips, trending bits, duets, and weekly challenges from comedians near you.",
};

export default function ClipsPage() {
  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Comedy Clips</h1>
          <p className="mt-2 text-zinc-400">
            Short-form comedy moments, trending bits, and viral discoveries.
          </p>
        </div>

        <ClipFeed />
      </div>
    </main>
  );
}
