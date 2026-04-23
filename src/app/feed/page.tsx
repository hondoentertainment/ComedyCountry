import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FeedContent } from "@/components/FeedContent";
import { DiscoveryPageNav } from "@/components/DiscoveryPageNav";

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
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <DiscoveryPageNav
          title="Feed"
          description="The inbox for your comedy graph: new shows, updates, and fresh reasons to come back."
        />
        <FeedContent />
      </div>
    </div>
  );
}
