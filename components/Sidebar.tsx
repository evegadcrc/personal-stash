"use client";

import { CategoryData } from "@/lib/data";
import { ShareWithOwner } from "@/lib/sharing";

interface SidebarProps {
  categories: CategoryData[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  unreadCounts: Record<string, number>;
  sharedCategories: ShareWithOwner[];
  selectedShareId: string | null;
  onSelectShare: (share: ShareWithOwner) => void;
  mySharedCategoryNames: Set<string>;
}

const CATEGORY_ICONS: Record<string, string> = {
  ai: "🤖",
  movies: "🎬",
  places: "📍",
  ideas: "💡",
  bookmarks: "🔖",
};

function capitalize(s: string) {
  return s.split(/[-\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function ShareIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-500 shrink-0"
      aria-label="Shared"
    >
      <circle cx="9" cy="2" r="1.5" />
      <circle cx="9" cy="10" r="1.5" />
      <circle cx="2" cy="6" r="1.5" />
      <line x1="3.5" y1="6" x2="7.5" y2="2.5" />
      <line x1="3.5" y1="6" x2="7.5" y2="9.5" />
    </svg>
  );
}

export default function Sidebar({
  categories,
  selected,
  onSelect,
  unreadCounts,
  sharedCategories,
  selectedShareId,
  onSelectShare,
  mySharedCategoryNames,
}: SidebarProps) {
  const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);
  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  const whitelistShares = sharedCategories.filter((s) => s.mode === "whitelist");
  const publicShares = sharedCategories.filter((s) => s.mode === "public");

  function shareButton(share: ShareWithOwner) {
    const icon = CATEGORY_ICONS[share.categoryName] ?? "📁";
    return (
      <button
        key={share.id}
        onClick={() => onSelectShare(share)}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
          selectedShareId === share.id
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span>{icon}</span>
          <span className="truncate">{capitalize(share.categoryName)}</span>
        </span>
        <span className="text-xs text-zinc-600 shrink-0">{share.itemCount}</span>
      </button>
    );
  }

  return (
    <aside className="w-full flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-3 mb-2">
        Library
      </p>

      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
          selected === null && selectedShareId === null
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        }`}
      >
        <span className="flex items-center gap-2">
          <span>📚</span>
          <span>All</span>
        </span>
        <span className="flex items-center gap-1.5">
          {totalUnread > 0 ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-emerald-400">{totalUnread}</span>
            </>
          ) : (
            <span className="text-xs text-zinc-600">{totalCount}</span>
          )}
        </span>
      </button>

      {/* Own categories */}
      {categories.map((cat) => {
        const unread = unreadCounts[cat.name] ?? 0;
        const isShared = mySharedCategoryNames.has(cat.name);
        return (
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
              {isShared && <ShareIcon />}
            </span>
            <span className="flex items-center gap-1.5">
              {unread > 0 ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-400">{unread}</span>
                </>
              ) : (
                <span className="text-xs text-zinc-600">{cat.items.length}</span>
              )}
            </span>
          </button>
        );
      })}

      {/* Shared with me (whitelist) */}
      {whitelistShares.length > 0 && (
        <>
          <div className="mt-3 mb-1 border-t border-zinc-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-3">
              Shared with me
            </p>
          </div>
          {whitelistShares.map(shareButton)}
        </>
      )}

      {/* Public */}
      {publicShares.length > 0 && (
        <>
          <div className="mt-3 mb-1 border-t border-zinc-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-3">
              Public
            </p>
          </div>
          {publicShares.map(shareButton)}
        </>
      )}
    </aside>
  );
}
