"use client";

import { useState, useEffect } from "react";
import { Item } from "@/lib/data";

interface Collection {
  id: string;
  name: string;
  color: string | null;
  _count: { items: number };
}

interface CollectionPickerModalProps {
  item: Item;
  onClose: () => void;
  onCollectionsChange?: (collections: Collection[]) => void;
}

const COLOR_OPTIONS = [
  { value: "indigo", label: "Indigo", cls: "bg-indigo-500" },
  { value: "rose", label: "Rose", cls: "bg-rose-500" },
  { value: "amber", label: "Amber", cls: "bg-amber-500" },
  { value: "emerald", label: "Emerald", cls: "bg-emerald-500" },
  { value: "sky", label: "Sky", cls: "bg-sky-500" },
];

const COLOR_DOT: Record<string, string> = {
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
};

export default function CollectionPickerModal({ item, onClose, onCollectionsChange }: CollectionPickerModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("indigo");
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/collections").then((r) => r.json()),
      fetch(`/api/items/${item.id}/collections`).then((r) => r.json()),
    ]).then(([colData, memberData]) => {
      setCollections(colData.collections ?? []);
      setMemberOf(new Set(memberData.collectionIds ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [item.id]);

  async function handleToggle(collectionId: string) {
    const isIn = memberOf.has(collectionId);
    setToggling(collectionId);
    try {
      if (isIn) {
        await fetch(`/api/collections/${collectionId}/items?itemId=${item.id}`, { method: "DELETE" });
        setMemberOf((prev) => { const s = new Set(prev); s.delete(collectionId); return s; });
        setCollections((prev) => prev.map((c) => c.id === collectionId ? { ...c, _count: { items: c._count.items - 1 } } : c));
      } else {
        await fetch(`/api/collections/${collectionId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id }),
        });
        setMemberOf((prev) => new Set([...prev, collectionId]));
        setCollections((prev) => prev.map((c) => c.id === collectionId ? { ...c, _count: { items: c._count.items + 1 } } : c));
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (res.ok) {
        const { collection } = await res.json();
        const updated = [...collections, collection];
        setCollections(updated);
        onCollectionsChange?.(updated);
        setNewName("");
        // Auto-add the item to the new collection
        await handleToggle(collection.id);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Add to Collection</h2>
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{item.title}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-xs">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-zinc-500">Loading…</p>
            </div>
          ) : collections.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No collections yet. Create one below.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {collections.map((col) => {
                const isIn = memberOf.has(col.id);
                const dot = COLOR_DOT[col.color ?? "indigo"] ?? "bg-indigo-500";
                return (
                  <button
                    key={col.id}
                    onClick={() => handleToggle(col.id)}
                    disabled={toggling === col.id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${
                      isIn ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    } ${toggling === col.id ? "opacity-50" : ""}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dot}`} />
                    <span className="flex-1 truncate">{col.name}</span>
                    <span className="text-xs text-zinc-600">{col._count.items}</span>
                    <span className={`text-xs font-bold ${isIn ? "text-emerald-400" : "text-zinc-700"}`}>
                      {isIn ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* New collection form */}
        <div className="border-t border-zinc-800 px-5 py-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">New Collection</p>
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name…"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewColor(c.value)}
                  className={`h-5 w-5 rounded-full ${c.cls} transition-transform ${newColor === c.value ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110" : ""}`}
                  title={c.label}
                />
              ))}
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Creating…" : "Create & Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
