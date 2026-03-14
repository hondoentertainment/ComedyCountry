"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SignUpFormProps = { callbackUrl?: string };

export function SignUpForm({ callbackUrl = "/" }: SignUpFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreeToTerms) {
      setError("You must agree to the Terms and Conditions and Privacy Policy.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      const url = `/auth/signin?registered=1${callbackUrl !== "/" ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;
      router.push(url);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
      {error && (
        <div className="rounded-lg bg-red-500/20 text-red-400 px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="username" className="block text-zinc-400 text-sm mb-1">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9._-]+"
          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="johndoe"
        />
        <p className="text-zinc-500 text-xs mt-1">
          Letters, numbers, periods, underscores, hyphens. 3–32 chars.
        </p>
      </div>
      <div>
        <label htmlFor="password" className="block text-zinc-400 text-sm mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="At least 8 characters"
        />
      </div>
      <div className="flex items-start gap-3">
        <input
          id="agreeToTerms"
          type="checkbox"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-600 focus:ring-amber-500 focus:ring-offset-0"
        />
        <label htmlFor="agreeToTerms" className="text-sm text-zinc-400">
          I agree to the{" "}
          <Link href="/terms" className="text-amber-500 hover:underline">
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-amber-500 hover:underline">
            Privacy Policy
          </Link>
          .
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
