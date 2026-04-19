import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NewFanClubForm } from "./NewFanClubForm";

export const metadata = {
  title: "Create Fan Club | Punchline Atlas",
  description: "Create a new fan club for comedy fans.",
};

export default async function NewFanClubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/fan-clubs/new");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-brand-gold mb-2">Create a fan club</h1>
      <p className="text-zinc-400 mb-8">
        Start a home base for fans of a comedian, a venue, a scene, or a specific show format.
      </p>
      <NewFanClubForm />
    </div>
  );
}
