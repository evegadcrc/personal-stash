"use client";

import { CategoryData } from "@/lib/data";

interface SidebarProps {
  categories: CategoryData[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  ai: "🤖",
  movies: "🎬",
  places: "📍",
  ideas: "💡",
  bookmarks: "🔖",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Sidebar({ categories, selected, onSelect }: SidebarProps) {
  const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <aside className="w-56 shrink-0 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-3 mb-2">
        Library
      </p>

      <button
        onClick={() => onSelect(null)}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
          selected === null
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        }`}
      >
        <span className="flex items-center gap-2">
          <span>📚</span>
          <span>All</span>
        </span>
        <span className="text-xs text-zinc-500">{totalCount}</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => onSelect(cat.name)}
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
            selected === cat.name
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{CATEGORY_ICONS[cat.name] ?? "📁"}</span>
            <span>{capitalize(cat.name)}</span>
          </span>
          <span className="text-xs text-zinc-500">{cat.items.length}</span>
        </button>
      ))}
    </aside>
  );
}
