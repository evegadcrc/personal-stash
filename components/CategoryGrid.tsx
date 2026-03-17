"use client";

import { useState, useRef } from "react";
import { CategoryData } from "@/lib/data";
import { ShareWithOwner } from "@/lib/sharing";
import { getCategoryIcon } from "@/lib/categories";
import { useLanguage } from "@/contexts/LanguageContext";

function titleCase(s: string) {
  return s.split(/[-\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function ShareIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
      <circle cx="9" cy="2" r="1.5" />
      <circle cx="9" cy="10" r="1.5" />
      <circle cx="2" cy="6" r="1.5" />
      <line x1="3.5" y1="6" x2="7.5" y2="2.5" />
      <line x1="3.5" y1="6" x2="7.5" y2="9.5" />
    </svg>
  );
}

interface CategoryGridProps {
  categories: CategoryData[];
  unreadCounts: Record<string, number>;
  membershipItemsMap: Record<string, unknown[]>;
  mySharedCategoryNames: Set<string>;
  sharedCategories: ShareWithOwner[];
  sharedUnreadCounts: Record<string, number>;
  onSelect: (name: string) => void;
  onSelectShare: (share: ShareWithOwner) => void;
  onDeleteCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => Promise<boolean>;
}

export default function CategoryGrid({
  categories,
  unreadCounts,
  membershipItemsMap,
  mySharedCategoryNames,
  sharedCategories,
  sharedUnreadCounts,
  onSelect,
  onSelectShare,
  onDeleteCategory,
  onRenameCategory,
}: CategoryGridProps) {
  const { t } = useLanguage();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cardCls = "group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-800/60";

  return (
    <div className="flex flex-col gap-6">
      {/* Personal categories */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {categories.map((cat) => {
          const icon = getCategoryIcon(cat.name);
          const unread = unreadCounts[cat.name] ?? 0;
          const memberCount = (membershipItemsMap[cat.name] ?? []).length;
          const totalCount = cat.items.length + memberCount;
          const isShared = mySharedCategoryNames.has(cat.name);
          const isEditing = editingCategory === cat.name;

          return (
            <div key={cat.name} className={cardCls}>
              <button
                onClick={() => { if (!isEditing) onSelect(cat.name); }}
                className="flex flex-col items-start gap-2 text-left w-full"
                tabIndex={isEditing ? -1 : 0}
              >
                <span className="text-3xl leading-none">{icon}</span>

                {isEditing ? (
                  <input
                    ref={inputRef}
                    autoFocus
                    defaultValue={cat.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const val = e.target.value.trim().replace(/\s+/g, "-");
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
                    className="w-full bg-zinc-700 text-zinc-100 text-sm px-1.5 py-0.5 rounded outline-none border border-zinc-500 focus:border-zinc-300"
                  />
                ) : (
                  <span className="font-semibold text-sm text-zinc-100 leading-snug line-clamp-2 break-words w-full">
                    {titleCase(cat.name)}
                  </span>
                )}

                <div className="flex items-center gap-1.5 flex-wrap">
                  {unread > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {unread} unread
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">{totalCount} {totalCount === 1 ? t.item : t.items}</span>
                  )}
                  {isShared && <ShareIcon />}
                </div>
              </button>

              {!isEditing && (
                <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingCategory(cat.name); }}
                    title="Rename"
                    className="flex h-6 w-6 items-center justify-center rounded text-[11px] text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                    aria-label="Rename category"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.name); }}
                    disabled={isShared}
                    title={isShared ? "Stop sharing before deleting" : "Delete category"}
                    className={`flex h-6 w-6 items-center justify-center rounded text-[11px] transition-colors ${
                      isShared
                        ? "text-zinc-700 cursor-not-allowed"
                        : "text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 cursor-pointer"
                    }`}
                    aria-label="Delete category"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shared with me */}
      {sharedCategories.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {t.sharedWithMe}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sharedCategories.map((share) => {
              const icon = getCategoryIcon(share.categoryName);
              const unread = sharedUnreadCounts[share.id] ?? 0;
              const ownerLabel = share.ownerName?.split(" ")[0] ?? share.ownerEmail.split("@")[0];

              return (
                <div key={share.id} className={cardCls}>
                  <button
                    onClick={() => onSelectShare(share)}
                    className="flex flex-col items-start gap-2 text-left w-full"
                  >
                    <span className="text-3xl leading-none">{icon}</span>
                    <span className="font-semibold text-sm text-zinc-100 leading-snug line-clamp-2 break-words w-full">
                      {titleCase(share.categoryName)}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {unread > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {unread} unread
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">{share.itemCount} {share.itemCount === 1 ? t.item : t.items}</span>
                      )}
                      <span className="text-xs text-zinc-600">· {ownerLabel}</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
