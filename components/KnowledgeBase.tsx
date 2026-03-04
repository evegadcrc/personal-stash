"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { CategoryData, Item } from "@/lib/data";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import SubcategoryFilter from "./SubcategoryFilter";
import ItemCard from "./ItemCard";
import AddItemModal from "./AddItemModal";
import EditItemModal from "./EditItemModal";
import ThemeToggle from "./ThemeToggle";
import Toast from "./Toast";

type ViewMode = "grid" | "list";
type SortMode = "date" | "name" | "color";

interface KnowledgeBaseProps {
  categories: CategoryData[];
  user?: { name?: string | null; email?: string | null; image?: string | null };
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
      className={active ? "text-zinc-100" : "text-zinc-500"}>
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
      className={active ? "text-zinc-100" : "text-zinc-500"}>
      <rect x="1" y="2" width="14" height="2.5" rx="1" />
      <rect x="1" y="6.75" width="14" height="2.5" rx="1" />
      <rect x="1" y="11.5" width="14" height="2.5" rx="1" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="3" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="7.25" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="11.5" width="14" height="1.5" rx="0.75" />
    </svg>
  );
}

export default function KnowledgeBase({ categories: initialCategories, user }: KnowledgeBaseProps) {
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [customOrder, setCustomOrder] = useState<Record<string, string[]>>({});
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load persisted view mode and custom order from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("stash-view-mode") as ViewMode | null;
    if (savedView === "grid" || savedView === "list") setViewMode(savedView);
    const savedOrder = localStorage.getItem("stash-custom-order");
    if (savedOrder) {
      try { setCustomOrder(JSON.parse(savedOrder)); } catch { /* ignore */ }
    }
  }, []);

  function handleSetViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("stash-view-mode", mode);
  }

  // "/" shortcut — focus search on desktop
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function showToast(msg: string) {
    setToast({ msg, id: Date.now() });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((cat) => ({ ...cat, items: cat.items.filter((item) => item.id !== id) }))
      );
      showToast("Item removed");
    }
  }

  async function handleToggleRead(id: string, read: boolean) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) => item.id === id ? { ...item, read } : item),
        }))
      );
      showToast(read ? "Marked as read ✓" : "Marked as unread");
    }
  }

  function handleAdd(item: Item) {
    setCategories((prev) => {
      const existing = prev.find((c) => c.name === item.category);
      if (existing) {
        return prev.map((c) =>
          c.name === item.category ? { ...c, items: [item, ...c.items] } : c
        );
      }
      return [...prev, { name: item.category, items: [item] }];
    });
    showToast("Item saved ✓");
  }

  function handleEditSave(updated: Item) {
    setCategories((prev) => {
      const removed = prev.map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => i.id !== updated.id),
      }));
      const targetExists = removed.find((c) => c.name === updated.category);
      if (targetExists) {
        return removed.map((c) =>
          c.name === updated.category ? { ...c, items: [updated, ...c.items] } : c
        );
      }
      return [...removed, { name: updated.category, items: [updated] }];
    });
    showToast("Changes saved ✓");
  }

  function handleCategoryChange(cat: string | null) {
    setSelectedCategory(cat);
    setSelectedSubcategory(null);
    setSelectedTag(null);
    setSearchQuery("");
    setSidebarOpen(false);
  }

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.name] = cat.items.filter((i) => !i.read).length;
    }
    return counts;
  }, [categories]);

  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = categories.find((c) => c.name === selectedCategory);
    if (!cat) return [];
    return [...new Set(cat.items.map((i) => i.subcategory))].sort();
  }, [categories, selectedCategory]);

  const filteredItems = useMemo(() => {
    let items: Item[] = selectedCategory
      ? (categories.find((c) => c.name === selectedCategory)?.items ?? [])
      : categories.flatMap((c) => c.items);

    if (selectedSubcategory) {
      items = items.filter((i) => i.subcategory === selectedSubcategory);
    }

    if (selectedTag) {
      items = items.filter((i) => i.tags.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          i.subcategory.toLowerCase().includes(q)
      );
    }

    const COLOR_PRIORITY: Record<string, number> = { rose: 0, amber: 1, blue: 2 };
    return items.sort((a, b) => {
      if (!!a.read !== !!b.read) return a.read ? 1 : -1;
      if (sortMode === "name") return a.title.localeCompare(b.title);
      if (sortMode === "color") {
        const pa = COLOR_PRIORITY[a.color ?? ""] ?? 3;
        const pb = COLOR_PRIORITY[b.color ?? ""] ?? 3;
        if (pa !== pb) return pa - pb;
      }
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    });
  }, [categories, selectedCategory, selectedSubcategory, selectedTag, searchQuery, sortMode]);

  const canReorder =
    selectedCategory !== null &&
    !searchQuery.trim() &&
    !selectedSubcategory &&
    !selectedTag;

  const displayedItems = useMemo(() => {
    if (!canReorder || !selectedCategory) return filteredItems;
    const order = customOrder[selectedCategory];
    if (!order || order.length === 0) return filteredItems;
    const itemMap = new Map(filteredItems.map((i) => [i.id, i]));
    const result: Item[] = [];
    for (const id of order) {
      const item = itemMap.get(id);
      if (item) { result.push(item); itemMap.delete(id); }
    }
    for (const item of itemMap.values()) result.unshift(item);
    return result;
  }, [filteredItems, canReorder, customOrder, selectedCategory]);

  function handleDragStart(id: string) { setDragSrcId(id); }
  function handleDragOverItem(id: string) { setDragOverId(id); }
  function handleDragEnd() { setDragSrcId(null); setDragOverId(null); }
  function handleDropOnItem(targetId: string) {
    if (!dragSrcId || dragSrcId === targetId || !selectedCategory) return;
    const ids = displayedItems.map((i) => i.id);
    const srcIdx = ids.indexOf(dragSrcId);
    const tgtIdx = ids.indexOf(targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const newOrder = [...ids];
    newOrder.splice(srcIdx, 1);
    newOrder.splice(tgtIdx, 0, dragSrcId);
    setCustomOrder((prev) => {
      const updated = { ...prev, [selectedCategory]: newOrder };
      localStorage.setItem("stash-custom-order", JSON.stringify(updated));
      return updated;
    });
    setDragSrcId(null);
    setDragOverId(null);
  }

  const categoryLabel = selectedCategory
    ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
    : "All";

  const hasActiveFilters = subcategories.length > 0 || selectedTag !== null;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, inline on desktop */}
      <nav
        className={`
          fixed md:relative top-0 left-0 h-full md:h-auto z-40 md:z-auto
          flex w-64 md:w-56 shrink-0 flex-col gap-4 overflow-y-auto
          border-r border-zinc-800 bg-zinc-950 px-3 py-6
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="px-3 flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold text-zinc-100">Stash</h1>
            <p className="text-xs text-zinc-500">Personal knowledge base</p>
          </div>
          <button
            className="md:hidden -mr-1 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <Sidebar
          categories={categories}
          selected={selectedCategory}
          onSelect={handleCategoryChange}
          unreadCounts={unreadCounts}
        />
      </nav>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="border-b border-zinc-800 px-4 md:px-6 py-3 md:py-4 shrink-0">

          {/* Primary row */}
          <div className="flex items-center gap-2">

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>

            <h2 className="text-base md:text-lg font-semibold text-zinc-100 flex-1 md:flex-none truncate">
              {categoryLabel}
            </h2>

            {/* Search bar — desktop inline */}
            <div className="hidden md:block flex-1 max-w-xs">
              <SearchBar value={searchQuery} onChange={setSearchQuery} inputRef={searchRef} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 overflow-hidden hover:border-zinc-500 transition-colors"
                    aria-label="User menu"
                    title={user.email ?? "Account"}
                  >
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.image} alt={user.name ?? "User"} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-zinc-300">
                        {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                        <div className="border-b border-zinc-800 px-3 py-2">
                          {user.name && <p className="text-xs font-medium text-zinc-200 truncate">{user.name}</p>}
                          {user.email && <p className="text-xs text-zinc-500 truncate">{user.email}</p>}
                        </div>
                        <button
                          onClick={() => signOut({ callbackUrl: "/login" })}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <ThemeToggle />
              <button
                onClick={() => setSortMode((s) => s === "date" ? "name" : s === "name" ? "color" : "date")}
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                title={`Sorted by ${sortMode} — click to toggle`}
              >
                {sortMode === "date" ? "↓ Date" : sortMode === "name" ? "↑ Name" : "◉ Color"}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-lg leading-none"
                aria-label="Add item"
                title="Add item"
              >
                +
              </button>
              <div className="hidden sm:flex items-center rounded-lg border border-zinc-700 p-0.5">
                <button
                  onClick={() => handleSetViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-zinc-700" : "hover:bg-zinc-800"}`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <GridIcon active={viewMode === "grid"} />
                </button>
                <button
                  onClick={() => handleSetViewMode("list")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-zinc-700" : "hover:bg-zinc-800"}`}
                  aria-label="List view"
                  title="List view"
                >
                  <ListIcon active={viewMode === "list"} />
                </button>
              </div>
            </div>
          </div>

          {/* Search bar — mobile full-width row */}
          <div className="mt-3 md:hidden">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Filters row */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {subcategories.length > 0 && (
                <SubcategoryFilter
                  subcategories={subcategories}
                  selected={selectedSubcategory}
                  onSelect={setSelectedSubcategory}
                />
              )}
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-700 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-600 transition-colors"
                >
                  #{selectedTag}
                  <span className="text-zinc-400 leading-none">✕</span>
                </button>
              )}
            </div>
          )}
        </header>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
          {displayedItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-zinc-400">No items found</p>
              {(searchQuery || selectedTag) && (
                <p className="text-sm text-zinc-600">Try a different search term</p>
              )}
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-zinc-600">
                {displayedItems.length} {displayedItems.length === 1 ? "item" : "items"}
                {selectedTag && (
                  <span> tagged <span className="text-zinc-400">#{selectedTag}</span></span>
                )}
              </p>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {displayedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      view="grid"
                      onDelete={handleDelete}
                      onToggleRead={handleToggleRead}
                      onEdit={setEditingItem}
                      onTagClick={setSelectedTag}
                      canReorder={canReorder}
                      isDragging={dragSrcId === item.id}
                      isDragOver={dragOverId === item.id}
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={() => handleDragOverItem(item.id)}
                      onDrop={() => handleDropOnItem(item.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {displayedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      view="list"
                      onDelete={handleDelete}
                      onToggleRead={handleToggleRead}
                      onEdit={setEditingItem}
                      onTagClick={setSelectedTag}
                      canReorder={canReorder}
                      isDragging={dragSrcId === item.id}
                      isDragOver={dragOverId === item.id}
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={() => handleDragOverItem(item.id)}
                      onDrop={() => handleDropOnItem(item.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddItemModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSave={handleAdd}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => { handleEditSave(updated); setEditingItem(null); }}
        />
      )}

      {toast && <Toast key={toast.id} message={toast.msg} onDone={() => setToast(null)} />}
    </div>
  );
}
