import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInButtons } from "./SignInButtons";

export const metadata = {
  title: "Sign In | Punchline Atlas",
  description: "Sign in to follow comedians and venues.",
};

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
        <p className="text-zinc-400 mb-8">
          Sign in to follow comedians and venues, and get personalized updates.
        </p>
        <SignInButtons />
      </div>
    </main>
  );
}
