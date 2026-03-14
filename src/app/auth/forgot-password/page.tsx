import Link from "next/link";

export const metadata = {
  title: "Forgot Password | Punchline Atlas",
  description: "Password recovery for Punchline Atlas.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
        <p className="text-zinc-400 mb-6">
          The credentials sign-in does not support self-service password reset.
          Please contact support to recover your account.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
        >
          Back to Sign in
        </Link>
      </div>
    </main>
  );
}
