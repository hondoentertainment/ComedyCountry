import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { SignInButtons } from "./SignInButtons";

export const metadata = {
  title: "Sign In | Punchline Atlas",
  description: "Sign in to follow comedians and venues.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; registered?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  const { callbackUrl, registered } = await searchParams;
  const providerIds = authOptions.providers.map((p) => p.id);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in</h1>
        <p className="text-zinc-400 mb-8">
          Sign in to follow comedians and venues, and get personalized updates.
        </p>
        {registered === "1" && (
          <div className="rounded-lg bg-emerald-500/20 text-emerald-400 px-4 py-2 text-sm mb-6">
            Account created. Sign in below.
          </div>
        )}
        <SignInButtons
          providerIds={providerIds}
          callbackUrl={typeof callbackUrl === "string" ? callbackUrl : "/"}
        />
        <p className="text-zinc-500 text-xs mt-6">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-amber-500 hover:underline">
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-amber-500 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
