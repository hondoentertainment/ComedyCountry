import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Developer Portal | Punchline Atlas",
  description: "Manage API keys, view documentation, and track usage.",
};

export default async function DeveloperPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  let keys: Array<{
    id: string;
    name: string;
    key: string;
    tier: string;
    rateLimit: number;
    lastUsedAt: Date | null;
    isActive: boolean;
    createdAt: Date;
  }> = [];

  try {
    keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // DB not configured
  }

  const activeKeys = keys.filter((k) => k.isActive);
  const revokedKeys = keys.filter((k) => !k.isActive);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Developer Portal</h1>
          <p className="text-zinc-400 text-sm">
            Manage your API keys, explore the docs, and track usage.
          </p>
        </div>

        {/* Quick links */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80">
            <h3 className="text-white font-semibold mb-2">REST API</h3>
            <p className="text-sm text-zinc-400 mb-3">
              Access comedian, venue, and event data programmatically.
            </p>
            <a
              href="/api/openapi.json"
              target="_blank"
              className="text-sm font-medium text-brand-gold hover:underline"
            >
              OpenAPI Spec &rarr;
            </a>
          </div>
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80">
            <h3 className="text-white font-semibold mb-2">Rate Limits</h3>
            <p className="text-sm text-zinc-400 mb-3">
              Free: 100/hr &middot; Pro: 1,000/hr &middot; Enterprise: 10,000/hr
            </p>
            <span className="text-sm text-zinc-500">Upgrade via account settings</span>
          </div>
          <div className="p-5 rounded-xl bg-brand-surface border border-zinc-800/80">
            <h3 className="text-white font-semibold mb-2">LLMs.txt</h3>
            <p className="text-sm text-zinc-400 mb-3">
              Machine-readable site description for AI agents.
            </p>
            <a
              href="/llms.txt"
              target="_blank"
              className="text-sm font-medium text-brand-gold hover:underline"
            >
              View llms.txt &rarr;
            </a>
          </div>
        </div>

        {/* API Keys */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              API Keys ({activeKeys.length} active)
            </h2>
          </div>

          {keys.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 rounded-xl bg-brand-surface border border-zinc-800/80">
              <p className="text-lg">No API keys yet.</p>
              <p className="text-sm mt-1">
                Create one via POST /api/developer/keys with a name.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-4 rounded-xl bg-brand-surface border border-zinc-800/80 flex items-start justify-between gap-4"
                >
                  <div>
                    <h3 className="text-white font-medium">{k.name}</h3>
                    <p className="text-sm text-zinc-400 font-mono mt-1">
                      {k.key.slice(0, 16)}...{k.key.slice(-4)}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                      <span>Tier: {k.tier}</span>
                      <span>Limit: {k.rateLimit}/hr</span>
                      <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                      {k.lastUsedAt && (
                        <span>Last used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400">
                    Active
                  </span>
                </div>
              ))}

              {revokedKeys.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-zinc-500 mt-6 mb-2">Revoked Keys</h3>
                  {revokedKeys.map((k) => (
                    <div
                      key={k.id}
                      className="p-4 rounded-xl bg-brand-surface/50 border border-zinc-800/60 flex items-start justify-between gap-4 opacity-60"
                    >
                      <div>
                        <h3 className="text-zinc-400 font-medium">{k.name}</h3>
                        <p className="text-sm text-zinc-500 font-mono mt-1">
                          {k.key.slice(0, 16)}...{k.key.slice(-4)}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-500">
                        Revoked
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
