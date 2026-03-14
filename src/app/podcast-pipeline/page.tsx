import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import PodcastPipelineCard from "@/components/PodcastPipelineCard";

export const metadata = {
  title: "Podcast Pipeline | Punchline Atlas",
  description: "Connect your podcast audience to live shows — track conversions, manage live recordings, and grow your ticket sales.",
};

export const dynamic = "force-dynamic";

export default async function PodcastPipelinePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const comedian = await getComedianForUser(session.user.id);

  if (!comedian) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-4">
          Podcast Pipeline
        </h1>
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-white mb-3">
            Claim Your Profile
          </h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Connect your podcast to your comedian profile to start tracking
            which episodes drive ticket sales and plan live recording sessions.
          </p>
          <a
            href="/comedian-dashboard"
            className="inline-block px-6 py-2 bg-brand-gold text-black font-semibold rounded-lg hover:bg-yellow-400 transition"
          >
            Get Started
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-gold">
          Podcast Pipeline
        </h1>
        <span className="text-sm text-zinc-400">
          Managing as {comedian.name}
        </span>
      </div>

      <div className="grid gap-6">
        <PodcastPipelineCard comedianId={comedian.id} />
      </div>
    </div>
  );
}
