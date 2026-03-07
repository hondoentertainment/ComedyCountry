import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FeedContent } from "@/components/FeedContent";

export const metadata = {
  title: "Feed | Punchline Atlas",
  description: "Your personalized feed of events, notifications, and updates from comedians and venues you follow.",
};

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/feed");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Feed</h1>
        <p className="text-zinc-400 mb-8">
          Notifications and updates from comedians and venues you follow.
        </p>
        <FeedContent />
      </div>
    </main>
  );
}
