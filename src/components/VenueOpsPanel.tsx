"use client";

import { useState } from "react";

const TABS = [
  { key: "tables", label: "Tables" },
  { key: "drinks", label: "Drinks" },
  { key: "door", label: "Door Sales" },
  { key: "comp", label: "Comp List" },
  { key: "staff", label: "Staff" },
  { key: "capacity", label: "Capacity" },
  { key: "menu", label: "Menu" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function SummaryCard({
  title,
  stats,
}: {
  title: string;
  stats: { label: string; value: string | number }[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TablesPanel() {
  return (
    <SummaryCard
      title="Table Layouts"
      stats={[
        { label: "Layouts", value: 0 },
        { label: "Total Seats", value: 0 },
        { label: "Default Layout", value: "None" },
        { label: "Sections", value: 0 },
      ]}
    />
  );
}

function DrinksPanel() {
  return (
    <SummaryCard
      title="Drink Minimums"
      stats={[
        { label: "Ticket Types", value: 0 },
        { label: "Min Count", value: "2" },
        { label: "Min Spend", value: "$0" },
        { label: "Enforcement", value: "Door" },
      ]}
    />
  );
}

function DoorSalesPanel() {
  return (
    <SummaryCard
      title="Walk-Up / Door Sales"
      stats={[
        { label: "Total Sales", value: 0 },
        { label: "Revenue", value: "$0" },
        { label: "Cash", value: 0 },
        { label: "Card", value: 0 },
      ]}
    />
  );
}

function CompListPanel() {
  return (
    <SummaryCard
      title="Comp List"
      stats={[
        { label: "Pending", value: 0 },
        { label: "Approved", value: 0 },
        { label: "Checked In", value: 0 },
        { label: "Total Comps", value: 0 },
      ]}
    />
  );
}

function StaffPanel() {
  return (
    <SummaryCard
      title="Staff Schedule"
      stats={[
        { label: "Shifts Today", value: 0 },
        { label: "Door Staff", value: 0 },
        { label: "Bar Staff", value: 0 },
        { label: "Managers", value: 0 },
      ]}
    />
  );
}

function CapacityPanel() {
  return (
    <SummaryCard
      title="Venue Capacity"
      stats={[
        { label: "Current Count", value: 0 },
        { label: "Max Capacity", value: 0 },
        { label: "% Full", value: "0%" },
        { label: "Last Updated", value: "N/A" },
      ]}
    />
  );
}

function MenuPanel() {
  return (
    <SummaryCard
      title="Menu"
      stats={[
        { label: "Drinks", value: 0 },
        { label: "Food", value: 0 },
        { label: "Pre-Orders", value: 0 },
        { label: "Avg Price", value: "$0" },
      ]}
    />
  );
}

const PANELS: Record<TabKey, () => JSX.Element> = {
  tables: TablesPanel,
  drinks: DrinksPanel,
  door: DoorSalesPanel,
  comp: CompListPanel,
  staff: StaffPanel,
  capacity: CapacityPanel,
  menu: MenuPanel,
};

export default function VenueOpsPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("tables");

  const ActivePanel = PANELS[activeTab];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Venue Operations">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active Panel */}
      <ActivePanel />
    </div>
  );
}
