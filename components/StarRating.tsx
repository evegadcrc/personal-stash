"use client";

import { useState } from "react";

interface StarRatingProps {
  itemId: string;
  myRating: number | null;
  avgRating: number | null;
  ratingCount: number;
  onRatingChange: (myRating: number | null, avgRating: number | null, ratingCount: number) => void;
}

export default function StarRating({
  itemId,
  myRating,
  avgRating,
  ratingCount,
  onRatingChange,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRate(star: number) {
    if (saving) return;
    const newRating = myRating === star ? null : star; // clicking current rating removes it
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: newRating }),
      });
      if (res.ok) {
        const data = await res.json();
        onRatingChange(data.myRating, data.avgRating, data.ratingCount);
      }
    } finally {
      setSaving(false);
    }
  }

  const display = hovered ?? myRating ?? 0;

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={saving}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleRate(star)}
            className={`text-base leading-none transition-colors ${
              star <= display
                ? "text-amber-400"
                : "text-zinc-600 hover:text-amber-400"
            } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      {ratingCount > 0 && (
        <span className="text-xs text-zinc-500">
          {avgRating !== null ? avgRating.toFixed(1) : ""}
          {ratingCount > 1 ? ` (${ratingCount})` : ""}
        </span>
      )}
    </div>
  );
}
