"use client";

import { useState } from "react";

interface ThumbsVotingProps {
  itemId: string;
  myVote: 1 | -1 | null;
  upCount: number;
  downCount: number;
  onVoteChange: (myVote: 1 | -1 | null, upCount: number, downCount: number) => void;
}

export default function ThumbsVoting({ itemId, myVote, upCount, downCount, onVoteChange }: ThumbsVotingProps) {
  const [saving, setSaving] = useState(false);

  async function handleVote(vote: 1 | -1) {
    if (saving) return;
    const newVote = myVote === vote ? null : vote;
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: newVote }),
      });
      if (res.ok) {
        const data = await res.json();
        onVoteChange(data.myVote, data.upCount, data.downCount);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => handleVote(1)}
        disabled={saving}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all border ${
          myVote === 1
            ? "bg-emerald-900/50 text-emerald-400 border-emerald-700/60"
            : "text-zinc-500 border-zinc-700 hover:text-emerald-400 hover:border-emerald-700/50"
        } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        aria-label="Thumbs up"
      >
        👍 {upCount > 0 && <span>{upCount}</span>}
      </button>
      <button
        onClick={() => handleVote(-1)}
        disabled={saving}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all border ${
          myVote === -1
            ? "bg-rose-900/50 text-rose-400 border-rose-700/60"
            : "text-zinc-500 border-zinc-700 hover:text-rose-400 hover:border-rose-700/50"
        } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        aria-label="Thumbs down"
      >
        👎 {downCount > 0 && <span>{downCount}</span>}
      </button>
    </div>
  );
}
