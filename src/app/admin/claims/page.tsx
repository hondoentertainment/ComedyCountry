import { prisma } from "@/lib/prisma";
import { ClaimActions } from "./ClaimActions";

export default async function AdminClaimsPage() {
  let claims: Array<{
    id: string;
    status: string;
    proofUrl: string | null;
    proofNote: string | null;
    createdAt: Date;
    user: { id: string; name: string | null; email: string | null };
    comedian: { id: string; name: string; slug: string };
  }> = [];

  try {
    const rawClaims = await prisma.comedianClaim.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    });

    // Resolve user and comedian details
    const userIds = Array.from(new Set(rawClaims.map((c) => c.userId)));
    const comedianIds = Array.from(new Set(rawClaims.map((c) => c.comedianId)));

    const [users, comedians] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
      prisma.comedian.findMany({ where: { id: { in: comedianIds } }, select: { id: true, name: true, slug: true } }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const comedianMap = new Map(comedians.map((c) => [c.id, c]));

    claims = rawClaims.map((c) => ({
      id: c.id,
      status: c.status,
      proofUrl: c.proofUrl,
      proofNote: c.proofNote,
      createdAt: c.createdAt,
      user: userMap.get(c.userId) ?? { id: c.userId, name: null, email: null },
      comedian: comedianMap.get(c.comedianId) ?? { id: c.comedianId, name: "Unknown", slug: "" },
    }));
  } catch {
    // Schema not migrated yet
  }

  const pending = claims.filter((c) => c.status === "PENDING");
  const resolved = claims.filter((c) => c.status !== "PENDING");

  return (
    <div className="md:mt-0 mt-12">
      <h1 className="text-2xl font-bold text-white mb-6">Comedian Claims</h1>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-orange-400 mb-4">
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((claim) => (
              <div
                key={claim.id}
                className="p-4 rounded-card bg-brand-surface border border-orange-500/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {claim.user.name ?? claim.user.email ?? "Unknown user"} wants to claim{" "}
                      <span className="text-brand-gold">{claim.comedian.name}</span>
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Submitted {new Date(claim.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {claim.proofUrl && (
                      <p className="text-zinc-400 text-sm mt-2">
                        Proof:{" "}
                        <a href={claim.proofUrl} target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">
                          {claim.proofUrl}
                        </a>
                      </p>
                    )}
                    {claim.proofNote && (
                      <p className="text-zinc-500 text-sm mt-1 italic">&ldquo;{claim.proofNote}&rdquo;</p>
                    )}
                  </div>
                  <ClaimActions claimId={claim.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="p-8 rounded-card bg-brand-surface border border-zinc-800/80 text-center mb-10">
          <p className="text-zinc-400">No pending claims. All caught up!</p>
        </div>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-400 mb-4">
            Resolved ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map((claim) => (
              <div
                key={claim.id}
                className="p-3 rounded-lg bg-brand-surface border border-zinc-800/80 flex items-center justify-between"
              >
                <div className="text-sm">
                  <span className="text-zinc-400">{claim.user.name ?? claim.user.email}</span>
                  <span className="text-zinc-600 mx-1">&rarr;</span>
                  <span className="text-zinc-300">{claim.comedian.name}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  claim.status === "APPROVED"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {claim.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
