"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CategoryNotesProps {
  category: string;
}

function formatUpdated(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CategoryNotes({ category }: CategoryNotesProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryRef = useRef(category);
  categoryRef.current = category;

  // Load note when category changes
  useEffect(() => {
    setLoaded(false);
    setContent("");
    setSavedAt(null);
    fetch(`/api/notes?category=${encodeURIComponent(category)}`)
      .then((r) => r.json())
      .then((data) => {
        if (categoryRef.current === category) {
          setContent(data.content ?? "");
          setSavedAt(data.updatedAt ?? null);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
  }, [category]);

  const save = useCallback(async (text: string, cat: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, content: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedAt(data.updatedAt);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  function handleChange(text: string) {
    setContent(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text, categoryRef.current), 1200);
  }

  return (
    <div className="border-t border-zinc-800 mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 md:px-6 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span>📝</span>
        <span className="font-medium">Notes</span>
        {savedAt && !open && content && (
          <span className="text-zinc-700 ml-1">· {content.slice(0, 40)}{content.length > 40 ? "…" : ""}</span>
        )}
        <span className="ml-auto text-zinc-700">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="px-4 md:px-6 pb-4 flex flex-col gap-1.5">
          {loaded ? (
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Scratch pad — jot down thoughts, links, ideas for this category…"
              rows={4}
              className="w-full resize-y rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors leading-relaxed"
            />
          ) : (
            <div className="h-24 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
          )}
          <div className="flex items-center gap-2 text-[11px] text-zinc-700">
            {saving ? (
              <span>Saving…</span>
            ) : savedAt ? (
              <span>Saved {formatUpdated(savedAt)}</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
