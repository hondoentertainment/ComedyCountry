import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { authorized: false as const, reason: "Not authenticated" };
  }
  if (session.user.role !== "admin") {
    return { authorized: false as const, reason: "Not authorized" };
  }
  return { authorized: true as const, session };
}
