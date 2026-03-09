"use client";

import { useState, useRef } from "react";
import { CategoryData } from "@/lib/data";
import { ShareWithOwner } from "@/lib/sharing";
import { useLanguage } from "@/contexts/LanguageContext";

interface SidebarProps {
  categories: CategoryData[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  unreadCounts: Record<string, number>;
  sharedCategories: ShareWithOwner[];
  selectedShareId: string | null;
  onSelectShare: (share: ShareWithOwner) => void;
  mySharedCategoryNames: Set<string>;
  emptyCategoryNames: Set<string>;
  onDeleteCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => Promise<boolean>;
}

const CATEGORY_ICONS: Record<string, string> = {
  ai: "🤖",
  movies: "🎬",
  places: "📍",
  ideas: "💡",
  bookmarks: "🔖",
};

function titleCase(s: string) {
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
  emptyCategoryNames,
  onDeleteCategory,
  onRenameCategory,
}: SidebarProps) {
  const { t } = useLanguage();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          <span className="truncate">{titleCase(share.categoryName)}</span>
        </span>
        <span className="text-xs text-zinc-600 shrink-0">{share.itemCount}</span>
      </button>
    );
  }

  return (
    <aside className="w-full flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-3 mb-2">
        {t.library}
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
          <span>{t.all}</span>
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
        const isEmpty = emptyCategoryNames.has(cat.name);
        const canDelete = isEmpty && !isShared;
        const isEditing = editingCategory === cat.name;
        const deleteHint = !isEmpty
          ? t.categoryHasItemsHint
          : isShared
          ? t.categoryIsSharedHint
          : t.deleteCategoryTitle;

        return (
          <div
            key={cat.name}
            className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              selected === cat.name
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            {/* Main clickable area / inline edit */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span>{CATEGORY_ICONS[cat.name] ?? "📁"}</span>
              {isEditing ? (
                <input
                  ref={inputRef}
                  autoFocus
                  defaultValue={cat.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const val = e.target.value.trim().toLowerCase().replace(/\s+/g, "-");
                    if (val && val !== cat.name) {
                      onRenameCategory(cat.name, val).then(() => setEditingCategory(null));
                    } else {
                      setEditingCategory(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingCategory(null);
                    e.stopPropagation();
                  }}
                  className="flex-1 min-w-0 bg-zinc-700 text-zinc-100 text-sm px-1.5 py-0.5 rounded outline-none border border-zinc-500 focus:border-zinc-300"
                />
              ) : (
                <button
                  onClick={() => onSelect(cat.name)}
                  className="flex items-center gap-1.5 min-w-0 text-left flex-1"
                >
                  <span className="truncate">{titleCase(cat.name)}</span>
                  {isShared && <ShareIcon />}
                </button>
              )}
            </div>

            {/* Right side: count/badge + action icons */}
            {!isEditing && (
              <div className="flex items-center gap-1 shrink-0">
                {unread > 0 ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-400">{unread}</span>
                  </>
                ) : (
                  <span className="text-xs text-zinc-600">{cat.items.length}</span>
                )}
                {/* Pencil — rename */}
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCategory(cat.name); }}
                  title="Rename"
                  className="opacity-0 group-hover:opacity-100 ml-1 flex h-4 w-4 items-center justify-center rounded text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer"
                  aria-label="Rename category"
                >
                  ✎
                </button>
                {/* X — delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); if (canDelete) onDeleteCategory(cat.name); }}
                  disabled={!canDelete}
                  title={deleteHint}
                  className={`opacity-0 group-hover:opacity-100 flex h-4 w-4 items-center justify-center rounded text-[10px] transition-all ${
                    canDelete
                      ? "text-zinc-500 hover:text-white hover:bg-zinc-700 cursor-pointer"
                      : "text-zinc-700 cursor-not-allowed"
                  }`}
                  aria-label={deleteHint}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Shared with me (whitelist) */}
      {whitelistShares.length > 0 && (
        <>
          <div className="mt-3 mb-1 border-t border-zinc-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-3">
              {t.sharedWithMe}
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
              {t.publicSection}
            </p>
          </div>
          {publicShares.map(shareButton)}
        </>
      )}
    </aside>
  );
}
