import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NewDiscussionForm } from "./NewDiscussionForm";

export const metadata = {
  title: "Start Discussion | Punchline Atlas",
  description: "Start a new comedy discussion thread.",
};

export default async function NewDiscussionPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; entityId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/discussions/new");
  }

  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Start a discussion</h1>
      <p className="text-zinc-400 mb-8">
        Give fans something worth responding to, whether it is about a comic, a room, or one specific show.
      </p>
      <NewDiscussionForm
        initialEntityType={params.entityType}
        initialEntityId={params.entityId}
      />
    </div>
  );
}
