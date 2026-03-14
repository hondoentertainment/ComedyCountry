import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminVenueForm } from "@/components/AdminVenueForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  if (id === "new") return { title: "New Venue | Admin" };
  const venue = await prisma.venue.findUnique({ where: { id }, select: { name: true } });
  return { title: venue ? `Edit ${venue.name} | Admin` : "Venue Not Found" };
}

export default async function AdminVenueEditPage({ params }: PageProps) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="md:mt-0 mt-12">
        <h1 className="text-2xl font-bold text-white mb-6">New Venue</h1>
        <AdminVenueForm />
      </div>
    );
  }

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: { photos: { orderBy: { sortOrder: "asc" } }, socialLinks: true },
  });

  if (!venue) notFound();

  return (
    <div className="md:mt-0 mt-12">
      <h1 className="text-2xl font-bold text-white mb-6">Edit Venue</h1>
      <AdminVenueForm venue={venue} />
    </div>
  );
}
