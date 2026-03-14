import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";

export const metadata = {
  title: "Admin | Punchline Atlas",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await requireAdmin();
  if (!result.authorized) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen flex">
      <AdminNav />
      <div className="flex-1 ml-0 md:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
