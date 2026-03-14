import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { SignUpForm } from "./SignUpForm";

export const metadata = {
  title: "Create account | Punchline Atlas",
  description: "Create an account to follow comedians and venues.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const resolvedCallback =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/")
      ? callbackUrl
      : "/";
  const session = await getServerSession(authOptions);
  if (session) redirect(resolvedCallback);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
        <p className="text-zinc-400 mb-8">
          Sign up with a username and password to follow comedians and venues.
        </p>
        <SignUpForm callbackUrl={resolvedCallback} />
        <p className="text-zinc-500 text-sm mt-6">
          Already have an account?{" "}
          <Link
            href={`/auth/signin${resolvedCallback !== "/" ? `?callbackUrl=${encodeURIComponent(resolvedCallback)}` : ""}`}
            className="text-amber-500 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
