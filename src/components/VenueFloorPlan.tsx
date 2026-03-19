"use client";

import { useState, useEffect, useCallback } from "react";

type Seat = {
  row: number;
  col: number;
  type: string;
  label?: string;
};

type TableLayout = {
  id: string;
  venueId: string;
  name: string;
  rows: number;
  columns: number;
  seats: Seat[];
  isDefault: boolean;
  createdAt: string;
};

const SEAT_TYPES = [
  { value: "table", label: "Table", color: "bg-brand-gold/80" },
  { value: "booth", label: "Booth", color: "bg-blue-500/80" },
  { value: "bar", label: "Bar Seat", color: "bg-purple-500/80" },
  { value: "vip", label: "VIP", color: "bg-green-500/80" },
  { value: "stage", label: "Stage", color: "bg-red-500/60" },
  { value: "aisle", label: "Aisle", color: "bg-transparent border border-zinc-700" },
  { value: "empty", label: "Empty", color: "bg-zinc-800/40" },
];

function getSeatColor(type: string): string {
  return SEAT_TYPES.find((st) => st.value === type)?.color ?? "bg-zinc-700";
}

interface VenueFloorPlanProps {
  venueId: string;
}

export default function VenueFloorPlan({ venueId }: VenueFloorPlanProps) {
  const [layouts, setLayouts] = useState<TableLayout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<TableLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState("table");
  const [editedSeats, setEditedSeats] = useState<Seat[]>([]);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newRows, setNewRows] = useState(8);
  const [newCols, setNewCols] = useState(10);

  const fetchLayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/venue-ops/tables?venueId=${venueId}`);
      if (!res.ok) throw new Error("Failed to load layouts");
      const data = await res.json();
      setLayouts(data);
      if (data.length > 0 && !selectedLayout) {
        const defaultLayout = data.find((l: TableLayout) => l.isDefault) ?? data[0];
        setSelectedLayout(defaultLayout);
        setEditedSeats(defaultLayout.seats ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load floor plans");
    } finally {
      setLoading(false);
    }
  }, [venueId, selectedLayout]);

  useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/venue-ops/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          name: newName.trim(),
          rows: newRows,
          columns: newCols,
          seats: [],
          isDefault: layouts.length === 0,
        }),
      });
      if (res.ok) {
        const layout = await res.json();
        setLayouts((prev) => [layout, ...prev]);
        setSelectedLayout(layout);
        setEditedSeats([]);
        setShowCreateForm(false);
        setNewName("");
        setEditMode(true);
      }
    } catch {
      // ignore
    }
    setSaving(false);
  }

  async function handleSaveLayout() {
    if (!selectedLayout) return;
    setSaving(true);
    try {
      const res = await fetch("/api/venue-ops/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedLayout.id, seats: editedSeats }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLayouts((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        setSelectedLayout(updated);
        setEditMode(false);
      }
    } catch {
      // ignore
    }
    setSaving(false);
  }

  async function handleDeleteLayout() {
    if (!selectedLayout || !confirm("Delete this floor plan?")) return;
    try {
      const res = await fetch(`/api/venue-ops/tables?id=${selectedLayout.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLayouts((prev) => prev.filter((l) => l.id !== selectedLayout.id));
        setSelectedLayout(layouts.length > 1 ? layouts.find((l) => l.id !== selectedLayout.id) ?? null : null);
        setEditMode(false);
      }
    } catch {
      // ignore
    }
  }

  function handleCellClick(row: number, col: number) {
    if (!editMode) return;

    setEditedSeats((prev) => {
      const existing = prev.findIndex((s) => s.row === row && s.col === col);
      if (existing >= 0) {
        if (prev[existing].type === selectedTool) {
          // Remove
          return prev.filter((_, i) => i !== existing);
        }
        // Replace
        const updated = [...prev];
        updated[existing] = { row, col, type: selectedTool };
        return updated;
      }
      // Add
      return [...prev, { row, col, type: selectedTool }];
    });
  }

  function getSeatAtPosition(row: number, col: number): Seat | undefined {
    const seats = editMode ? editedSeats : (selectedLayout?.seats ?? []);
    return seats.find((s) => s.row === row && s.col === col);
  }

  if (loading) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-zinc-800 rounded w-32" />
          <div className="h-64 bg-zinc-800/50 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-brand-surface border border-red-800/50 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">Floor Plan</h3>
          {layouts.length > 0 && (
            <select
              value={selectedLayout?.id ?? ""}
              onChange={(e) => {
                const layout = layouts.find((l) => l.id === e.target.value) ?? null;
                setSelectedLayout(layout);
                setEditedSeats(layout?.seats ?? []);
                setEditMode(false);
              }}
              className="bg-brand-dark border border-zinc-700 text-zinc-300 rounded-lg px-3 py-1.5 text-sm focus:border-brand-gold focus:outline-none"
            >
              {layouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleSaveLayout}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditedSeats(selectedLayout?.seats ?? []);
                }}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {selectedLayout && (
                <button
                  onClick={() => {
                    setEditMode(true);
                    setEditedSeats(selectedLayout.seats ?? []);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90"
              >
                + New Layout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="p-4 rounded-lg bg-brand-dark border border-zinc-700 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-brand-surface border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none"
                placeholder="Main Room"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rows</label>
              <input
                type="number"
                value={newRows}
                onChange={(e) => setNewRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-1.5 rounded bg-brand-surface border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Columns</label>
              <input
                type="number"
                value={newCols}
                onChange={(e) => setNewCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-1.5 rounded bg-brand-surface border border-zinc-700 text-white text-sm focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="px-4 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-1.5 text-zinc-400 text-sm hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tool palette (edit mode) */}
      {editMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 text-xs uppercase tracking-wider mr-1">Place:</span>
          {SEAT_TYPES.map((st) => (
            <button
              key={st.value}
              onClick={() => setSelectedTool(st.value)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTool === st.value
                  ? "bg-white/10 text-white ring-1 ring-brand-gold"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${st.color}`} />
              {st.label}
            </button>
          ))}
          <button
            onClick={handleDeleteLayout}
            className="ml-auto text-xs text-red-400 hover:text-red-300"
          >
            Delete Layout
          </button>
        </div>
      )}

      {/* Grid */}
      {selectedLayout ? (
        <div className="p-4 rounded-lg bg-brand-dark border border-zinc-800 overflow-x-auto">
          {/* Stage indicator */}
          <div className="flex justify-center mb-3">
            <div className="px-8 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium uppercase tracking-wider">
              Stage
            </div>
          </div>

          <div
            className="grid gap-1 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${selectedLayout.columns}, minmax(24px, 1fr))`,
              maxWidth: `${selectedLayout.columns * 36}px`,
            }}
          >
            {Array.from({ length: selectedLayout.rows }).map((_, row) =>
              Array.from({ length: selectedLayout.columns }).map((_, col) => {
                const seat = getSeatAtPosition(row, col);
                return (
                  <button
                    key={`${row}-${col}`}
                    onClick={() => handleCellClick(row, col)}
                    disabled={!editMode}
                    className={`aspect-square rounded-sm transition-all text-[8px] font-medium ${
                      seat
                        ? getSeatColor(seat.type) + " text-white"
                        : "bg-zinc-800/20 hover:bg-zinc-700/30"
                    } ${editMode ? "cursor-pointer hover:ring-1 hover:ring-brand-gold/50" : "cursor-default"}`}
                    title={seat ? `${seat.type}${seat.label ? `: ${seat.label}` : ""}` : `${row + 1},${col + 1}`}
                  >
                    {seat?.label ? seat.label.substring(0, 2) : ""}
                  </button>
                );
              }),
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4 justify-center text-xs text-zinc-500">
            {SEAT_TYPES.filter((st) => st.value !== "empty" && st.value !== "aisle").map((st) => {
              const seats = editMode ? editedSeats : (selectedLayout.seats ?? []);
              const count = seats.filter((s: Seat) => s.type === st.value).length;
              if (count === 0) return null;
              return (
                <div key={st.value} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-sm ${st.color}`} />
                  <span>
                    {count} {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-lg bg-brand-surface border border-zinc-800 text-center">
          <p className="text-zinc-400">
            No floor plans yet. Create one to start managing your venue layout.
          </p>
        </div>
      )}
    </div>
  );
}
