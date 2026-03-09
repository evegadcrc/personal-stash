"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { CategoryData, Item } from "@/lib/data";
import { ShareWithOwner } from "@/lib/sharing";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import SubcategoryFilter from "./SubcategoryFilter";
import ItemCard from "./ItemCard";
import AddItemModal from "./AddItemModal";
import EditItemModal from "./EditItemModal";
import ThemeToggle from "./ThemeToggle";
import Toast from "./Toast";
import ShareSettingsModal from "./ShareSettingsModal";
import FriendsModal from "./FriendsModal";
import NotificationsPanel from "./NotificationsPanel";
import AddToShareModal from "./AddToShareModal";

type ViewMode = "grid" | "list";
type SortMode = "date" | "name" | "color";

interface MyShare {
  id: string;
  categoryName: string;
  mode: string;
  allowedEmails: string[];
}

interface KnowledgeBaseProps {
  categories: CategoryData[];
  user?: { name?: string | null; email?: string | null; image?: string | null };
  sharedCategories: ShareWithOwner[];
  pendingCount: number;
  currentUserEmail: string;
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

export default function KnowledgeBase({
  categories: initialCategories,
  user,
  sharedCategories: initialSharedCategories,
  pendingCount: initialPendingCount,
  currentUserEmail,
}: KnowledgeBaseProps) {
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedShare, setSelectedShare] = useState<ShareWithOwner | null>(null);
  const [sharedItems, setSharedItems] = useState<Item[]>([]);
  const [sharedContributors, setSharedContributors] = useState<{ email: string; name: string | null; avatar: string | null }[]>([]);
  // Keyed by categoryName — populated eagerly when myShares loads so there's no per-click delay
  const [categoryContributorsMap, setCategoryContributorsMap] = useState<Record<string, { email: string; name: string | null; avatar: string | null }[]>>({});
  const [categoryMembershipItemsMap, setCategoryMembershipItemsMap] = useState<Record<string, Item[]>>({});
  const [loadingSharedItems, setLoadingSharedItems] = useState(false);
  const [sharedUnreadCounts, setSharedUnreadCounts] = useState<Record<string, number>>({});
  const [sharedCategories, setSharedCategories] = useState<ShareWithOwner[]>(initialSharedCategories);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [myShares, setMyShares] = useState<MyShare[]>([]);
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
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [shareSettingsCategory, setShareSettingsCategory] = useState<string | null>(null);
  const [addToShareItem, setAddToShareItem] = useState<Item | null>(null);
  const [customOrder, setCustomOrder] = useState<Record<string, string[]>>({});
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load persisted view mode, custom order, and my shares
  useEffect(() => {
    const savedView = localStorage.getItem("stash-view-mode") as ViewMode | null;
    if (savedView === "grid" || savedView === "list") setViewMode(savedView);
    const savedOrder = localStorage.getItem("stash-custom-order");
    if (savedOrder) {
      try { setCustomOrder(JSON.parse(savedOrder)); } catch { /* ignore */ }
    }
  }, []);

  // Load my shares + prefetch membership items/contributors for all owned shares in parallel
  useEffect(() => {
    if (!currentUserEmail) return;
    fetch("/api/sharing")
      .then((r) => r.json())
      .then((data) => {
        const shares: MyShare[] = data.myShares ?? [];
        setMyShares(shares);
        setSharedCategories(data.sharedWithMe ?? initialSharedCategories);

        // Prefetch all owned shares in parallel — no delay when user clicks a shared category
        Promise.all(
          shares.map((s) =>
            fetch(`/api/sharing/${s.id}`)
              .then((r) => r.json())
              .then((d) => ({
                categoryName: s.categoryName,
                contributors: (d.contributors ?? []) as { email: string; name: string | null; avatar: string | null }[],
                membershipItems: ((d.items ?? []) as Item[]).filter((i) => !!i.membershipId),
              }))
              .catch(() => ({ categoryName: s.categoryName, contributors: [], membershipItems: [] }))
          )
        ).then((results) => {
          const contribMap: Record<string, { email: string; name: string | null; avatar: string | null }[]> = {};
          const itemsMap: Record<string, Item[]> = {};
          for (const r of results) {
            contribMap[r.categoryName] = r.contributors;
            itemsMap[r.categoryName] = r.membershipItems;
          }
          setCategoryContributorsMap(contribMap);
          setCategoryMembershipItemsMap(itemsMap);
        });
      })
      .catch(() => {});
  }, [currentUserEmail]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleSelectShare(share: ShareWithOwner | null) {
    setSelectedShare(share);
    if (share) setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedTag(null);
    setSearchQuery("");
    setSidebarOpen(false);
    if (!share) { setSharedItems([]); setSharedContributors([]); return; }

    setLoadingSharedItems(true);
    try {
      const res = await fetch(`/api/sharing/${share.id}`);
      const data = await res.json() as { items: Item[]; contributors?: { email: string; name: string | null; avatar: string | null }[] };
      const items = data.items ?? [];
      setSharedItems(items);
      setSharedContributors(data.contributors ?? []);
      setSharedUnreadCounts((prev) => ({
        ...prev,
        [share.id]: items.filter((i) => !i.read).length,
      }));
    } catch {
      setSharedItems([]);
      setSharedContributors([]);
    } finally {
      setLoadingSharedItems(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedShare) {
        setSharedItems((prev) => prev.filter((item) => item.id !== id));
        setSharedCategories((prev) =>
          prev.map((s) => s.id === selectedShare.id ? { ...s, itemCount: Math.max(0, s.itemCount - 1) } : s)
        );
      } else {
        setCategories((prev) =>
          prev.map((cat) => ({ ...cat, items: cat.items.filter((item) => item.id !== id) }))
        );
      }
      showToast("Item removed");
    }
  }

  async function handleRemoveFromShare(membershipId: string) {
    const shareId = selectedShare?.id ?? currentCategoryShare?.id;
    if (!shareId) return;
    const res = await fetch(`/api/sharing/${shareId}/members/${membershipId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (selectedShare) {
        setSharedItems((prev) => prev.filter((item) => item.membershipId !== membershipId));
        setSharedCategories((prev) =>
          prev.map((s) => s.id === shareId ? { ...s, itemCount: Math.max(0, s.itemCount - 1) } : s)
        );
      } else if (selectedCategory) {
        setCategoryMembershipItemsMap((prev) => ({
          ...prev,
          [selectedCategory]: (prev[selectedCategory] ?? []).filter((i) => i.membershipId !== membershipId),
        }));
      }
      showToast("Removed from shared category");
    }
  }

  async function handleToggleRead(id: string, read: boolean) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    if (res.ok) {
      if (selectedShare) {
        setSharedItems((prev) => {
          const updated = prev.map((item) => item.id === id ? { ...item, read } : item);
          setSharedUnreadCounts((counts) => ({
            ...counts,
            [selectedShare.id]: updated.filter((i) => !i.read).length,
          }));
          return updated;
        });
      } else {
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            items: cat.items.map((item) => item.id === id ? { ...item, read } : item),
          }))
        );
      }
      showToast(read ? "Marked as read ✓" : "Marked as unread");
    }
  }

  function handleAdd(item: Item) {
    if (selectedShare) {
      setSharedItems((prev) => [item, ...prev]);
      setSharedCategories((prev) =>
        prev.map((s) => s.id === selectedShare.id ? { ...s, itemCount: s.itemCount + 1 } : s)
      );
    } else if (item.sharedOnly && item.membershipId) {
      // Contributed to a shared category — update the map so it shows instantly
      setCategoryMembershipItemsMap((prev) => ({
        ...prev,
        [item.category]: [item, ...(prev[item.category] ?? [])],
      }));
    } else if (!item.sharedOnly) {
      // Only add to personal library if item is not shared-only
      setCategories((prev) => {
        const existing = prev.find((c) => c.name === item.category);
        if (existing) {
          return prev.map((c) =>
            c.name === item.category ? { ...c, items: [item, ...c.items] } : c
          );
        }
        return [...prev, { name: item.category, items: [item] }];
      });
    }
    showToast("Item saved ✓");
  }

  function handleEditSave(updated: Item) {
    if (selectedShare) {
      setSharedItems((prev) =>
        prev.map((item) => item.id === updated.id ? updated : item)
      );
    } else {
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
    }
    showToast("Changes saved ✓");
  }

  function handleCategoryChange(cat: string | null) {
    setSelectedCategory(cat);
    setSelectedShare(null);
    setSharedItems([]);
    setSelectedSubcategory(null);
    setSelectedTag(null);
    setSearchQuery("");
    setSidebarOpen(false);
  }

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      const membershipUnread = (categoryMembershipItemsMap[cat.name] ?? []).filter((i) => !i.read).length;
      counts[cat.name] = cat.items.filter((i) => !i.read).length + membershipUnread;
    }
    return counts;
  }, [categories, categoryMembershipItemsMap]);

  // Derived from map — always in memory, no per-click fetch delay
  const categoryMembershipItems = selectedCategory ? (categoryMembershipItemsMap[selectedCategory] ?? []) : [];
  const categoryContributors = selectedCategory ? (categoryContributorsMap[selectedCategory] ?? []) : [];

  const activeItems = selectedShare ? sharedItems : (
    selectedCategory
      ? [
          ...(categories.find((c) => c.name === selectedCategory)?.items ?? []),
          ...categoryMembershipItems,
        ]
      : categories.flatMap((c) => c.items)
  );

  const subcategories = useMemo(() => {
    if (selectedShare) return [...new Set(sharedItems.map((i) => i.subcategory))].sort();
    if (!selectedCategory) return [];
    const cat = categories.find((c) => c.name === selectedCategory);
    if (!cat) return [];
    return [...new Set(cat.items.map((i) => i.subcategory))].sort();
  }, [categories, selectedCategory, selectedShare, sharedItems]);

  const filteredItems = useMemo(() => {
    let items = [...activeItems];

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
      if (sortMode === "name") return a.title.localeCompare(b.title);
      if (sortMode === "color") {
        const pa = COLOR_PRIORITY[a.color ?? ""] ?? 3;
        const pb = COLOR_PRIORITY[b.color ?? ""] ?? 3;
        if (pa !== pb) return pa - pb;
      }
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    });
  }, [activeItems, selectedSubcategory, selectedTag, searchQuery, sortMode]);

  const canReorder =
    selectedCategory !== null &&
    selectedShare === null &&
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

  function titleCase(s: string) {
    return s.split(/[-\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  const categoryLabel = selectedShare
    ? titleCase(selectedShare.categoryName)
    : selectedCategory
    ? titleCase(selectedCategory)
    : "All";

  const hasActiveFilters = subcategories.length > 0 || selectedTag !== null;

  const mySharedCategoryNames = useMemo(
    () => new Set(myShares.map((s) => s.categoryName)),
    [myShares]
  );

  // The share record for the currently selected personal category (if it's a shared category)
  const currentCategoryShare = selectedCategory
    ? myShares.find((s) => s.categoryName === selectedCategory) ?? null
    : null;

  // All shares the current user can contribute to (own + shared with me)
  const allAvailableShares = useMemo(() => {
    const ownAsShares = myShares.map((s) => ({
      id: s.id,
      categoryName: s.categoryName,
      ownerName: user?.name ?? null,
      ownerEmail: currentUserEmail,
      ownerAvatar: user?.image ?? null,
      isOwn: true as const,
    }));
    return [...ownAsShares, ...sharedCategories];
  }, [myShares, sharedCategories, currentUserEmail, user]);

  // Share settings for current category (if any)
  const existingShareForCategory = shareSettingsCategory
    ? myShares.find((s) => s.categoryName === shareSettingsCategory) ?? null
    : null;

  function handleShareSaved() {
    // Refresh my shares
    fetch("/api/sharing")
      .then((r) => r.json())
      .then((data) => {
        setMyShares(data.myShares ?? []);
        setSharedCategories(data.sharedWithMe ?? sharedCategories);
      })
      .catch(() => {});
  }

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
          sharedCategories={sharedCategories}
          selectedShareId={selectedShare?.id ?? null}
          onSelectShare={handleSelectShare}
          mySharedCategoryNames={mySharedCategoryNames}
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

            {/* Share button — visible when own category is selected */}
            {selectedCategory && (
              <button
                onClick={() => setShareSettingsCategory(selectedCategory)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                title={`Share "${selectedCategory}"`}
                aria-label="Share category"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="2" r="1.5" />
                  <circle cx="9" cy="10" r="1.5" />
                  <circle cx="2" cy="6" r="1.5" />
                  <line x1="3.5" y1="6" x2="7.5" y2="2.5" />
                  <line x1="3.5" y1="6" x2="7.5" y2="9.5" />
                </svg>
                Share
              </button>
            )}

            {/* Search bar — desktop inline */}
            <div className="hidden md:block flex-1 max-w-xs">
              <SearchBar value={searchQuery} onChange={setSearchQuery} inputRef={searchRef} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
              {user && (
                <div className="relative">
                  {/* Notification badge button */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setNotifPanelOpen((o) => !o);
                        setUserMenuOpen(false);
                      }}
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
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none pointer-events-none">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </div>

                  {/* Notifications panel */}
                  {notifPanelOpen && (
                    <NotificationsPanel
                      onClose={() => setNotifPanelOpen(false)}
                      onPendingChange={setPendingCount}
                      onOpenFriends={() => {
                        setNotifPanelOpen(false);
                        setShowFriendsModal(true);
                      }}
                    />
                  )}

                  {/* User dropdown — opens on second click or separately */}
                  <button
                    onClick={() => {
                      setUserMenuOpen((o) => !o);
                      setNotifPanelOpen(false);
                    }}
                    className="sr-only"
                    aria-label="User menu options"
                  />
                </div>
              )}

              {/* User name dropdown (separate from avatar) */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setUserMenuOpen((o) => !o);
                      setNotifPanelOpen(false);
                    }}
                    className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                    title={user.email ?? "Account"}
                  >
                    {user.name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Account"}
                    <span className="text-zinc-600">▾</span>
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
                          onClick={() => { setUserMenuOpen(false); setShowFriendsModal(true); }}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                        >
                          Friends
                          {pendingCount > 0 && (
                            <span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white font-bold">
                              {pendingCount}
                            </span>
                          )}
                        </button>
                        {selectedCategory && (
                          <button
                            onClick={() => { setUserMenuOpen(false); setShareSettingsCategory(selectedCategory); }}
                            className="w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                          >
                            Share &quot;{selectedCategory}&quot;…
                          </button>
                        )}
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

          {/* Contributor avatars — shown in shared view OR when owner views their own shared category */}
          {(() => {
            const raw = selectedShare ? sharedContributors : categoryContributors;
            const ownerEmail = selectedShare?.ownerEmail ?? currentUserEmail;
            // Sort: current user first → owner → everyone else
            const contributors = [...raw].sort((a, b) => {
              if (a.email === currentUserEmail) return -1;
              if (b.email === currentUserEmail) return 1;
              if (a.email === ownerEmail) return -1;
              if (b.email === ownerEmail) return 1;
              return (a.name ?? a.email).localeCompare(b.name ?? b.email);
            });
            if (contributors.length === 0) return null;
            const MAX_SHOWN = 5;
            const shown = contributors.slice(0, MAX_SHOWN);
            const overflow = contributors.length - MAX_SHOWN;
            return (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-zinc-600">Contributors</span>
                <div className="flex items-center">
                  {shown.map((c, i) => {
                    const label = c.name ?? c.email;
                    const initial = label.charAt(0).toUpperCase();
                    return (
                      <div
                        key={c.email}
                        className="group relative"
                        style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full overflow-hidden bg-zinc-700 border-2 border-zinc-950 text-[10px] font-semibold text-zinc-200 cursor-default select-none">
                          {c.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.avatar} alt={label} className="h-full w-full object-cover" />
                          ) : (
                            initial
                          )}
                        </div>
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" style={{ zIndex: 50 }}>
                          {label}
                          {c.email === ownerEmail && (
                            <span className="ml-1 text-zinc-500">· owner</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div
                      className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-zinc-700 border-2 border-zinc-950 px-1.5 text-[9px] font-bold text-zinc-400 cursor-default"
                      style={{ marginLeft: -8 }}
                    >
                      +{overflow}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
          {loadingSharedItems ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-zinc-500 text-sm">Loading…</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              {searchQuery || selectedTag || selectedSubcategory ? (
                <>
                  <p className="text-zinc-400">No items found</p>
                  <p className="text-sm text-zinc-600">Try a different search term</p>
                </>
              ) : selectedShare ? (
                <>
                  <p className="text-2xl">📭</p>
                  <p className="text-zinc-400">Nothing here yet</p>
                  <p className="text-sm text-zinc-600">Be the first to add something to this shared category</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-400">No items found</p>
                  <p className="text-sm text-zinc-600">Add your first item with the + button</p>
                </>
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
                      currentUserEmail={currentUserEmail}
                      isSharedView={!!selectedShare || !!currentCategoryShare}
                      shareOwnerEmail={selectedShare?.ownerEmail ?? (currentCategoryShare ? currentUserEmail : undefined)}
                      onRemoveFromShare={handleRemoveFromShare}
                      onAddToShare={setAddToShareItem}
                      hasAvailableShares={sharedCategories.length > 0}
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
                      currentUserEmail={currentUserEmail}
                      isSharedView={!!selectedShare || !!currentCategoryShare}
                      shareOwnerEmail={selectedShare?.ownerEmail ?? (currentCategoryShare ? currentUserEmail : undefined)}
                      onRemoveFromShare={handleRemoveFromShare}
                      onAddToShare={setAddToShareItem}
                      hasAvailableShares={sharedCategories.length > 0}
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
          shareId={selectedShare?.id}
          shareCategory={selectedShare?.categoryName}
          availableShares={selectedShare ? undefined : allAvailableShares}
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

      {shareSettingsCategory && (
        <ShareSettingsModal
          categoryName={shareSettingsCategory}
          existingShare={
            existingShareForCategory
              ? {
                  id: existingShareForCategory.id,
                  mode: existingShareForCategory.mode as "whitelist" | "public",
                  allowedEmails: existingShareForCategory.allowedEmails,
                }
              : null
          }
          onClose={() => setShareSettingsCategory(null)}
          onSaved={handleShareSaved}
          onDeleted={() => {
            // If viewing this category as a shared view, navigate away
            if (selectedShare?.id === existingShareForCategory?.id) {
              handleSelectShare(null);
            }
            handleShareSaved();
          }}
        />
      )}

      {showFriendsModal && (
        <FriendsModal
          onClose={() => setShowFriendsModal(false)}
          onPendingChange={setPendingCount}
        />
      )}

      {addToShareItem && (
        <AddToShareModal
          item={addToShareItem}
          availableShares={sharedCategories}
          onClose={() => setAddToShareItem(null)}
          onAdded={() => showToast("Added to shared category ✓")}
        />
      )}

      {toast && <Toast key={toast.id} message={toast.msg} onDone={() => setToast(null)} />}
    </div>
  );
}
