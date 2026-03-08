import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminEventForm } from "@/components/AdminEventForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  if (id === "new") return { title: "New Event | Admin" };
  const event = await prisma.event.findUnique({
    where: { id },
    select: { title: true, comedians: { include: { comedian: { select: { name: true } } } } },
  });
  const title = event?.title || event?.comedians.map(ec => ec.comedian.name).join(", ") || "Event";
  return { title: `Edit ${title} | Admin` };
}

export default async function AdminEventEditPage({ params }: PageProps) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="md:mt-0 mt-12">
        <h1 className="text-2xl font-bold text-white mb-6">New Event</h1>
        <AdminEventForm />
      </div>
    );
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      comedians: { include: { comedian: { select: { id: true, name: true } } } },
    },
  });

  if (!event) notFound();

  const eventData = {
    ...event,
    date: event.date.toISOString(),
    priceMin: event.priceMin ? Number(event.priceMin) : null,
    priceMax: event.priceMax ? Number(event.priceMax) : null,
  };

  return (
    <div className="md:mt-0 mt-12">
      <h1 className="text-2xl font-bold text-white mb-6">Edit Event</h1>
      <AdminEventForm event={eventData} />
    </div>
  );
}
