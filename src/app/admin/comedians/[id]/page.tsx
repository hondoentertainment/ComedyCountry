import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminComedianForm } from "@/components/AdminComedianForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  if (id === "new") return { title: "New Comedian | Admin" };
  const comedian = await prisma.comedian.findUnique({ where: { id }, select: { name: true } });
  return { title: comedian ? `Edit ${comedian.name} | Admin` : "Comedian Not Found" };
}

export default async function AdminComedianEditPage({ params }: PageProps) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="md:mt-0 mt-12">
        <h1 className="text-2xl font-bold text-white mb-6">New Comedian</h1>
        <AdminComedianForm />
      </div>
    );
  }

  const comedian = await prisma.comedian.findUnique({
    where: { id },
    include: { genres: true, socialLinks: true },
  });

  if (!comedian) notFound();

  return (
    <div className="md:mt-0 mt-12">
      <h1 className="text-2xl font-bold text-white mb-6">Edit Comedian</h1>
      <AdminComedianForm comedian={comedian} />
    </div>
  );
}
