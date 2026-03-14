"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

const OAUTH_BUTTONS: Record<string, { label: string; icon: React.ReactNode }> = {
  google: {
    label: "Continue with Google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
};

type SignInButtonsProps = { providerIds: string[]; callbackUrl?: string };

export function SignInButtons({ providerIds, callbackUrl = "/" }: SignInButtonsProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const oauthIds = providerIds.filter((id) => id !== "credentials");
  const hasCredentials = providerIds.includes("credentials");

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid username or password");
        setLoading(false);
        return;
      }
      if (result?.url) window.location.href = result.url;
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {oauthIds.map((id) => {
        const config = OAUTH_BUTTONS[id];
        if (!config) return null;
        return (
          <button
            key={id}
            type="button"
            onClick={() => signIn(id, { callbackUrl })}
            className="w-full px-5 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors flex items-center justify-center gap-3"
          >
            {config.icon}
            {config.label}
          </button>
        );
      })}

      {oauthIds.length > 0 && hasCredentials && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-zinc-900 text-zinc-500">or</span>
          </div>
        </div>
      )}

      {hasCredentials && (
        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4 text-left">
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
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Your username"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="password" className="block text-zinc-400 text-sm mb-1">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-amber-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in with username & password"}
          </button>
        </form>
      )}

      {hasCredentials && (
        <p className="text-zinc-500 text-sm text-center">
          Don&apos;t have an account?{" "}
          <Link
            href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-amber-500 hover:underline"
          >
            Create one
          </Link>
        </p>
      )}

      {providerIds.length === 0 && (
        <p className="text-zinc-500 text-sm">
          Sign-in is not configured. Set up Google OAuth or ensure the app is configured.
        </p>
      )}
    </div>
  );
}
