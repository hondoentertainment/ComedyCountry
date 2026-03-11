import VenueOpsPanel from "@/components/VenueOpsPanel";

export const metadata = {
  title: "Venue Operations | Punchline Atlas",
  description: "Smart venue operations dashboard for managing seating, sales, comp lists, staff, and more.",
};

export default function VenueOpsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Venue Operations
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your venue&apos;s seating, door sales, comp list, staff schedule, and more.
        </p>
      </div>

      <VenueOpsPanel />
    </main>
  );
}
