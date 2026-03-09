"use client";

import { useState } from "react";
import { Item } from "@/lib/data";
import { ShareWithOwner } from "@/lib/sharing";

interface AddToShareModalProps {
  item: Item;
  availableShares: ShareWithOwner[];
  onClose: () => void;
  onAdded: (shareId: string) => void;
}

export default function AddToShareModal({
  item,
  availableShares,
  onClose,
  onAdded,
}: AddToShareModalProps) {
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!selectedShareId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/sharing/${selectedShareId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to add");
      }
      onAdded(selectedShareId);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Add to shared category</h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[220px]">{item.title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {availableShares.map((share) => {
            const label = `${share.ownerName?.split(" ")[0] ?? share.ownerEmail.split("@")[0]}'s ${share.categoryName}`;
            return (
              <button
                key={share.id}
                onClick={() => setSelectedShareId(share.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  selectedShareId === share.id
                    ? "border-zinc-500 bg-zinc-800"
                    : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/40"
                }`}
              >
                <span className="text-base">🔗</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{label}</p>
                  <p className="text-xs text-zinc-500 capitalize">{share.mode}</p>
                </div>
              </button>
            );
          })}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleAdd}
          disabled={!selectedShareId || saving}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 transition-colors"
        >
          {saving ? "Adding…" : "Add to shared category"}
        </button>
      </div>
    </div>
  );
}
