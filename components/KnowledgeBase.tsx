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
import CategoryNotes from "./CategoryNotes";
import CollectionPickerModal from "./CollectionPickerModal";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { normalizeCategory } from "@/lib/categories";
import TourOverlay from "./TourOverlay";
import CategoryGrid from "./CategoryGrid";
import IconPickerModal from "./IconPickerModal";

interface CollectionMeta {
  id: string;
  name: string;
  color: string | null;
  _count: { items: number };
}

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
  aiAvailable: boolean;
  tourCompleted?: boolean;
  shareUrl?: string;
  shareText?: string;
  // Deep-link params — passed from server component so they survive soft navigations
  initialItemId?: string;
  initialShareId?: string;
  initialCategoryName?: string;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
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

export default function KnowledgeBase(props: KnowledgeBaseProps) {
  return (
    <LanguageProvider>
      <KnowledgeBaseContent {...props} />
    </LanguageProvider>
  );
}

function KnowledgeBaseContent({
  categories: initialCategories,
  user,
  sharedCategories: initialSharedCategories,
  pendingCount: initialPendingCount,
  currentUserEmail,
  aiAvailable,
  tourCompleted = false,
  shareUrl,
  shareText,
  initialItemId,
  initialShareId,
  initialCategoryName,
}: KnowledgeBaseProps) {
  const { lang, setLang, t } = useLanguage();
  const [showTour, setShowTour] = useState(!tourCompleted);
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
  const [notifCount, setNotifCount] = useState(0);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [myShares, setMyShares] = useState<MyShare[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [showAddModal, setShowAddModal] = useState(!!(shareUrl || shareText));
  const [sharePreFill, setSharePreFill] = useState<{ url?: string; text?: string } | undefined>(
    shareUrl || shareText ? { url: shareUrl, text: shareText } : undefined
  );
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [shareSettingsCategory, setShareSettingsCategory] = useState<string | null>(null);
  const [addToShareItem, setAddToShareItem] = useState<Item | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);
  const [customOrder, setCustomOrder] = useState<Record<string, string[]>>({});
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragSourceCategory, setDragSourceCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  // When dragging from a shared-with-me view we need the shareId + membershipId
  const [dragFromShare, setDragFromShare] = useState<{ shareId: string; membershipId: string | undefined } | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<CollectionMeta | null>(null);
  const [collectionItems, setCollectionItems] = useState<Item[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [collectionPickerItem, setCollectionPickerItem] = useState<Item | null>(null);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  const [showAllShared, setShowAllShared] = useState(false);
  const [allSharedItems, setAllSharedItems] = useState<Item[]>([]);
  const [loadingAllShared, setLoadingAllShared] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>({});
  const [iconPickerCategory, setIconPickerCategory] = useState<string | null>(null);

  // Load persisted view mode, custom order, and my shares
  useEffect(() => {
    const savedView = localStorage.getItem("stash-view-mode") as ViewMode | null;
    if (savedView === "grid" || savedView === "list") setViewMode(savedView);
    const savedOrder = localStorage.getItem("stash-custom-order");
    if (savedOrder) {
      try { setCustomOrder(JSON.parse(savedOrder)); } catch { /* ignore */ }
    }
  }, []);

  // Load collections on mount
  useEffect(() => {
    if (!currentUserEmail) return;
    fetch("/api/collections")
      .then((r) => r.json())
      .then((data) => setCollections(data.collections ?? []))
      .catch(() => {});
  }, [currentUserEmail]);

  // Load category icons on mount
  useEffect(() => {
    if (!currentUserEmail) return;
    fetch("/api/category-icons")
      .then((r) => r.json())
      .then((data) => setCategoryIcons(data.icons ?? {}))
      .catch(() => {});
  }, [currentUserEmail]);

  // Fetch notification count on mount + poll every 60s
  useEffect(() => {
    if (!currentUserEmail) return;
    function fetchCount() {
      fetch("/api/notifications?count=true")
        .then((r) => r.json())
        .then((data) => setNotifCount(data.count ?? 0))
        .catch(() => {});
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [currentUserEmail]);

  // Register for web push notifications
  useEffect(() => {
    if (!currentUserEmail) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    async function subscribePush() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // already subscribed on this device

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {
        // Push subscription is best-effort — ignore errors
      }
    }

    subscribePush();
  }, [currentUserEmail]);

  // Central handler: navigate to item + expand its card + dismiss in-app notif
  async function handleOpenItem(itemId: string | null, shareId: string | null, categoryName: string | null) {
    if (!itemId) return;

    // Navigate to the right view
    if (shareId) {
      let share = sharedCategories.find((s) => s.id === shareId);
      let freshMyShares = myShares;

      if (!share && !myShares.find((s) => s.id === shareId)) {
        // Local state may be stale (app was backgrounded, notification arrived before
        // the async /api/sharing fetch completed). Re-fetch to get current shares.
        try {
          const data = await fetch("/api/sharing").then((r) => r.json());
          const freshShared: ShareWithOwner[] = data.sharedWithMe ?? [];
          freshMyShares = data.myShares ?? [];
          setSharedCategories(freshShared);
          setMyShares(freshMyShares);
          share = freshShared.find((s) => s.id === shareId);
        } catch {
          // best-effort
        }
      }

      if (share) {
        handleSelectShare(share);
      } else {
        // Check if it's one of the current user's own shared categories
        // (share owner receives notifications about contributor items — shareId is theirs)
        const ownShare = freshMyShares.find((s) => s.id === shareId);
        if (ownShare) {
          handleCategoryChange(ownShare.categoryName);
        } else {
          setToast({ msg: "This item is private or no longer available.", id: Date.now() });
          return;
        }
      }
    } else if (categoryName) {
      handleCategoryChange(categoryName);
    } else {
      // Search personal categories
      for (const cat of categories) {
        if (cat.items.some((i) => i.id === itemId)) {
          handleCategoryChange(cat.name);
          break;
        }
      }
    }

    setFocusItemId(itemId);

    // If item not in local state yet (added while page was open, not yet refreshed),
    // fetch it and inject into the right category so the card exists and can expand.
    const allLoaded = [
      ...categories.flatMap((c) => c.items),
      ...sharedItems,
      ...Object.values(categoryMembershipItemsMap).flat(),
    ];
    if (!allLoaded.some((i) => i.id === itemId)) {
      try {
        const res = await fetch(`/api/items/${itemId}`);
        if (res.ok) {
          const { item } = await res.json() as { item: Item };
          const targetCat = categoryName ? normalizeCategory(categoryName) : item.category;
          if (item.ownerEmail !== currentUserEmail) {
            // Contributor item — inject into categoryMembershipItemsMap to avoid
            // duplicate keys when the membership map later loads from the server.
            setCategoryMembershipItemsMap((prev) => ({
              ...prev,
              [targetCat]: [item, ...(prev[targetCat] ?? []).filter((i) => i.id !== itemId)],
            }));
          } else {
            setCategories((prev) =>
              prev.map((c) =>
                c.name === targetCat
                  ? { ...c, items: [item, ...c.items.filter((i) => i.id !== itemId)] }
                  : c
              )
            );
          }
        } else if (res.status === 403 || res.status === 404) {
          setFocusItemId(null);
          setToast({ msg: "This item is private or no longer available.", id: Date.now() });
        }
      } catch {
        // best-effort — ignore
      }
    }

    fetch(`/api/notifications?itemId=${encodeURIComponent(itemId)}`, { method: "PATCH" })
      .then(() => setNotifCount((c) => Math.max(0, c - 1)))
      .catch(() => {});
  }

  // Keep a ref to the latest handleOpenItem so SW listeners and effects never have a stale closure
  const handleOpenItemRef = useRef(handleOpenItem);
  useEffect(() => { handleOpenItemRef.current = handleOpenItem; });

  // Handle deep-link props (passed from server component via searchParams).
  // Re-runs whenever the props change so soft navigations (App Router) work too.
  useEffect(() => {
    if (!initialItemId) return;
    // Clear the URL params without triggering a navigation
    window.history.replaceState({}, "", "/");
    handleOpenItemRef.current(initialItemId, initialShareId ?? null, initialCategoryName ?? null);
  }, [initialItemId, initialShareId, initialCategoryName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for postMessage from SW when app tab is already open
  useEffect(() => {
    function onSwMessage(event: MessageEvent) {
      if (event.data?.type === "OPEN_ITEM") {
        handleOpenItemRef.current(
          event.data.itemId ?? null,
          event.data.shareId ?? null,
          event.data.categoryName ?? null,
        );
      }
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onSwMessage);
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

  // Keyboard shortcuts: "/" → search, "n" → add item
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "n" && !inInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowAddModal(true);
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
    setShowAllShared(false);
    setAllSharedItems([]);
    setSelectedCollection(null);
    setCollectionItems([]);
    if (share) setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedTag(null);
    setSearchQuery("");
    setShowUnreadOnly(false);
    setShowStaleOnly(false);
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
      showToast(t.itemRemoved);
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
      showToast(t.removedFromShared);
    }
  }

  async function handleColorChange(id: string, color: string | null) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) => item.id === id ? { ...item, color: color ?? undefined } as typeof item : item),
        }))
      );
    }
  }

  async function handleToggleRead(id: string, read: boolean) {
    // Pass shareId so server knows to use UserItemRead path for non-owners
    const shareId = selectedShare?.id ?? (showAllShared ? "all-shared" : undefined);
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read, ...(shareId ? { shareId } : {}) }),
    });
    if (res.ok) {
      if (showAllShared) {
        setAllSharedItems((prev) => prev.map((item) => item.id === id ? { ...item, read } : item));
      } else if (selectedShare) {
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
      showToast(read ? t.markedAsRead : t.markedAsUnread);
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
    showToast(t.itemSaved);
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
    showToast(t.changesSaved);
  }

  async function handleRenameCollection(id: string, newName: string): Promise<boolean> {
    const res = await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) return false;
    const { collection } = await res.json() as { collection: CollectionMeta };
    setCollections((prev) => prev.map((c) => c.id === id ? { ...c, name: collection.name } : c));
    if (selectedCollection?.id === id) setSelectedCollection((prev) => prev ? { ...prev, name: collection.name } : prev);
    return true;
  }

  async function handleDeleteCollection(id: string) {
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (selectedCollection?.id === id) {
      setSelectedCollection(null);
      setCollectionItems([]);
    }
  }

  async function handleSelectCollection(col: CollectionMeta) {
    setSelectedCollection(col);
    setSelectedCategory(null);
    setSelectedShare(null);
    setSharedItems([]);
    setShowAllShared(false);
    setAllSharedItems([]);
    setSelectedSubcategory(null);
    setSelectedTag(null);
    setSearchQuery("");
    setShowUnreadOnly(false);
    setShowStaleOnly(false);
    setSidebarOpen(false);
    setLoadingCollection(true);
    try {
      const res = await fetch(`/api/collections/${col.id}`);
      const data = await res.json();
      setCollectionItems(data.items ?? []);
    } catch {
      setCollectionItems([]);
    } finally {
      setLoadingCollection(false);
    }
  }

  function handleCategoryChange(cat: string | null) {
    setSelectedCategory(cat);
    setSelectedShare(null);
    setSharedItems([]);
    setShowAllShared(false);
    setAllSharedItems([]);
    setSelectedCollection(null);
    setCollectionItems([]);
    setSelectedSubcategory(null);
    setSelectedTag(null);
    setSearchQuery("");
    setShowUnreadOnly(false);
    setShowStaleOnly(false);
    setSidebarOpen(false);
  }

  async function handleSelectAllShared() {
    setShowAllShared(true);
    setSelectedShare(null);
    setSelectedCategory(null);
    setSharedItems([]);
    setSelectedSubcategory(null);
    setSelectedTag(null);
    setSearchQuery("");
    setShowUnreadOnly(false);
    setShowStaleOnly(false);
    setSidebarOpen(false);

    setLoadingAllShared(true);
    try {
      const results = await Promise.all(
        sharedCategories.map((s) =>
          fetch(`/api/sharing/${s.id}`)
            .then((r) => r.json())
            .then((d) => ({ shareId: s.id, items: (d.items ?? []) as Item[] }))
            .catch(() => ({ shareId: s.id, items: [] as Item[] }))
        )
      );
      // Dedupe by id, combine all
      const seen = new Set<string>();
      const combined: Item[] = [];
      for (const { shareId, items } of results) {
        for (const item of items) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            combined.push(item);
          }
        }
        // Update unread counts per share
        setSharedUnreadCounts((prev) => ({
          ...prev,
          [shareId]: items.filter((i) => !i.read).length,
        }));
      }
      combined.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
      setAllSharedItems(combined);
    } finally {
      setLoadingAllShared(false);
    }
  }

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      const membershipUnread = (categoryMembershipItemsMap[cat.name] ?? []).filter((i) => !i.read).length;
      counts[cat.name] = cat.items.filter((i) => !i.read).length + membershipUnread;
    }
    return counts;
  }, [categories, categoryMembershipItemsMap]);

  // Update browser tab title with total unread count (personal + shared)
  useEffect(() => {
    const personal = Object.values(unreadCounts).reduce((s, n) => s + n, 0);
    const shared = Object.values(sharedUnreadCounts).reduce((s, n) => s + n, 0);
    const total = personal + shared;
    document.title = total > 0 ? `(${total}) Personal Stash` : "Personal Stash";
  }, [unreadCounts, sharedUnreadCounts]);

  // Derived from map — always in memory, no per-click fetch delay
  const categoryMembershipItems = selectedCategory ? (categoryMembershipItemsMap[selectedCategory] ?? []) : [];
  const categoryContributors = selectedCategory ? (categoryContributorsMap[selectedCategory] ?? []) : [];

  const activeItems = selectedCollection ? collectionItems : showAllShared ? allSharedItems : selectedShare ? sharedItems : (
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

    if (showUnreadOnly) {
      items = items.filter((i) => !i.read);
    }
    if (showStaleOnly) {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      items = items.filter((i) => !i.read && new Date(i.dateAdded).getTime() < cutoff);
    }
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
  }, [activeItems, showUnreadOnly, showStaleOnly, selectedSubcategory, selectedTag, searchQuery, sortMode]);

  const canReorder =
    selectedCategory !== null &&
    selectedShare === null &&
    !searchQuery.trim() &&
    !selectedSubcategory &&
    !selectedTag;

  // Can drag to move to another category — true for any non-collection personal or shared view
  // Per-item: only items owned by currentUserEmail are actually draggable
  const canDragBase = !showAllShared && !selectedCollection && categories.length > 1;

  const displayedItems = useMemo(() => {
    if (!canReorder || !selectedCategory || sortMode !== "date") return filteredItems;
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
  }, [filteredItems, canReorder, customOrder, selectedCategory, sortMode]);

  function handleDragStart(id: string, fromShare?: { shareId: string; membershipId: string | undefined }) {
    setDragSrcId(id);
    setDragSourceCategory(selectedCategory);
    setDragFromShare(fromShare ?? null);
  }
  function handleDragOverItem(id: string) { setDragOverId(id); }
  function handleDragEnd() {
    setDragSrcId(null);
    setDragOverId(null);
    setDragSourceCategory(null);
    setDragOverCategory(null);
    setDragFromShare(null);
  }

  async function handleMoveItemToCategory(targetCategory: string) {
    const itemId = dragSrcId;
    const srcCat = dragSourceCategory;
    const fromShare = dragFromShare;

    // Must have src (either a personal category or a shared view)
    if (!itemId || (srcCat === null && fromShare === null) || srcCat === targetCategory) {
      setDragOverCategory(null);
      return;
    }

    setDragSrcId(null);
    setDragSourceCategory(null);
    setDragOverCategory(null);
    setDragFromShare(null);

    // Locate the item in current view
    const item = srcCat
      ? categories.find((c) => c.name === srcCat)?.items.find((i) => i.id === itemId)
      : sharedItems.find((i) => i.id === itemId);
    if (!item) return;

    // Optimistic update
    if (srcCat) {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.name === srcCat) return { ...cat, items: cat.items.filter((i) => i.id !== itemId) };
          if (cat.name === targetCategory) return { ...cat, items: [{ ...item, category: targetCategory }, ...cat.items] };
          return cat;
        })
      );
    } else {
      // Remove from shared view
      setSharedItems((prev) => prev.filter((i) => i.id !== itemId));
      // Add to personal target category
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name === targetCategory ? { ...cat, items: [{ ...item, category: targetCategory, membershipId: undefined, sharedOnly: false }, ...cat.items] } : cat
        )
      );
    }

    // API: update category
    const res = await fetch(`/api/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        url: item.url,
        summary: item.summary,
        category: targetCategory,
        subcategory: item.subcategory,
        tags: item.tags,
        source: item.source,
        content: item.content ?? null,
        color: item.color ?? null,
      }),
    });

    if (!res.ok) {
      showToast("Failed to move item");
      // Revert
      if (srcCat) {
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.name === targetCategory) return { ...cat, items: cat.items.filter((i) => i.id !== itemId) };
            if (cat.name === srcCat) return { ...cat, items: [item, ...cat.items] };
            return cat;
          })
        );
      } else {
        setSharedItems((prev) => [item, ...prev]);
        setCategories((prev) =>
          prev.map((cat) => cat.name === targetCategory ? { ...cat, items: cat.items.filter((i) => i.id !== itemId) } : cat)
        );
      }
      return;
    }

    // If dragged from shared-with-me, also remove the SharedMembership
    if (fromShare?.shareId && fromShare.membershipId) {
      await fetch(`/api/sharing/${fromShare.shareId}/members/${fromShare.membershipId}`, { method: "DELETE" });
    }

    showToast(`Moved to ${titleCase(targetCategory)}`);
  }
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

  const categoryLabel = selectedCollection
    ? selectedCollection.name
    : showAllShared
    ? "All Shared"
    : selectedShare
    ? titleCase(selectedShare.categoryName)
    : selectedCategory
    ? titleCase(selectedCategory)
    : t.categories;

  const hasActiveFilters = subcategories.length > 0 || selectedTag !== null;

  // Stale unread: personal items unread for 30+ days
  const staleUnreadCount = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return categories.flatMap((c) => c.items).filter(
      (i) => !i.read && new Date(i.dateAdded).getTime() < cutoff
    ).length;
  }, [categories]);

  const mySharedCategoryNames = useMemo(
    () => new Set(myShares.map((s) => s.categoryName)),
    [myShares]
  );

  const emptyCategoryNames = useMemo(() => {
    const set = new Set<string>();
    for (const cat of categories) {
      if (cat.items.length === 0 && (categoryMembershipItemsMap[cat.name] ?? []).length === 0) {
        set.add(cat.name);
      }
    }
    return set;
  }, [categories, categoryMembershipItemsMap]);

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

  async function handleRenameCategory(oldName: string, newName: string): Promise<boolean> {
    const res = await fetch(`/api/categories/${encodeURIComponent(oldName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      showToast(d.error ?? "Rename failed");
      return false;
    }
    const data = await res.json() as { newName: string };
    const finalName = data.newName;
    setCategories((prev) =>
      prev.map((c) => c.name === oldName ? { ...c, name: finalName } : c)
    );
    if (selectedCategory === oldName) setSelectedCategory(finalName);
    setMyShares((prev) =>
      prev.map((s) => s.categoryName === oldName ? { ...s, categoryName: finalName } : s)
    );
    setCategoryMembershipItemsMap((prev) => {
      if (!(oldName in prev)) return prev;
      const updated = { ...prev };
      updated[finalName] = updated[oldName];
      delete updated[oldName];
      return updated;
    });
    return true;
  }

  function handleExport() {
    const label = categoryLabel.toLowerCase().replace(/\s+/g, "-");
    const data = activeItems.map(({ id, title, url, summary, category, subcategory, tags, dateAdded, source, read, color, content }) => ({
      id, title, url, summary, category, subcategory, tags,
      dateAdded, source, read, color: color ?? undefined, content: content ?? undefined,
    }));
    const md = data.map((i) => [
      `## ${i.title}`,
      i.url ? `**URL:** ${i.url}` : null,
      `**Category:** ${i.category}${i.subcategory ? ` / ${i.subcategory}` : ""}`,
      i.tags.length ? `**Tags:** ${i.tags.map((tg) => `\`${tg}\``).join(", ")}` : null,
      `**Added:** ${new Date(i.dateAdded).toLocaleDateString()}`,
      "",
      i.summary,
      i.content ? `\n${i.content}` : null,
    ].filter(Boolean).join("\n")).join("\n\n---\n\n");
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const mdBlob = new Blob([`# ${categoryLabel}\n\n${md}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(jsonBlob);
    a.download = `stash-${label}.json`;
    a.click();
    setTimeout(() => {
      a.href = URL.createObjectURL(mdBlob);
      a.download = `stash-${label}.md`;
      a.click();
    }, 300);
  }

  async function handleIconSave(categoryName: string, icon: string) {
    if (!icon) {
      await fetch(`/api/category-icons/${encodeURIComponent(categoryName)}`, { method: "DELETE" });
      setCategoryIcons((prev) => { const next = { ...prev }; delete next[categoryName]; return next; });
    } else {
      await fetch(`/api/category-icons/${encodeURIComponent(categoryName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon }),
      });
      setCategoryIcons((prev) => ({ ...prev, [categoryName]: icon }));
    }
  }

  async function handleTourComplete() {
    setShowTour(false);
    await fetch("/api/tour", { method: "POST" }).catch(() => {});
  }

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
        data-tour="sidebar"
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
            <h1 className="text-base font-bold text-zinc-100">Personal Stash</h1>
            <p className="text-xs text-zinc-500">Your digital memory</p>
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
          categoryIcons={categoryIcons}
          onSelect={handleCategoryChange}
          unreadCounts={unreadCounts}
          sharedCategories={sharedCategories}
          selectedShareId={selectedShare?.id ?? null}
          onSelectShare={handleSelectShare}
          sharedUnreadCounts={sharedUnreadCounts}
          mySharedCategoryNames={mySharedCategoryNames}
          emptyCategoryNames={emptyCategoryNames}
          onDeleteCategory={setConfirmDeleteCategory}
          onRenameCategory={handleRenameCategory}
          showAllShared={showAllShared}
          onSelectAllShared={handleSelectAllShared}
          collections={collections}
          selectedCollectionId={selectedCollection?.id ?? null}
          onSelectCollection={handleSelectCollection}
          onCollectionsChange={setCollections}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          dragSourceCategory={dragSourceCategory ?? (dragSrcId ? "__shared__" : null)}
          dragOverCategory={dragOverCategory}
          onDragOverCategory={setDragOverCategory}
          onDragLeaveCategory={() => setDragOverCategory(null)}
          onDropOnCategory={handleMoveItemToCategory}
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
              aria-label={t.openMenu}
            >
              <MenuIcon />
            </button>

            <h2 className="text-base md:text-lg font-semibold text-zinc-100 flex-1 md:flex-none truncate">
              {categoryLabel}
            </h2>

            {/* Share button — visible when own category is selected */}
            {selectedCategory && (
              <button
                data-tour="share-button"
                onClick={() => setShareSettingsCategory(selectedCategory)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                title={`${t.share} "${selectedCategory}"`}
                aria-label={t.share}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="2" r="1.5" />
                  <circle cx="9" cy="10" r="1.5" />
                  <circle cx="2" cy="6" r="1.5" />
                  <line x1="3.5" y1="6" x2="7.5" y2="2.5" />
                  <line x1="3.5" y1="6" x2="7.5" y2="9.5" />
                </svg>
                {t.share}
              </button>
            )}

            {/* Search bar — desktop inline */}
            <div data-tour="search-bar" className="hidden md:block flex-1 max-w-xs">
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
                    {(pendingCount + notifCount) > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none pointer-events-none">
                        {(pendingCount + notifCount) > 9 ? "9+" : (pendingCount + notifCount)}
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
                      onNotifCountChange={setNotifCount}
                      onOpenItem={handleOpenItem}
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
                          {t.friends}
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
                            {t.share} &quot;{selectedCategory}&quot;…
                          </button>
                        )}
                        <button
                          onClick={() => signOut({ callbackUrl: "/login" })}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                        >
                          {t.signOut}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <ThemeToggle />
              {/* Language toggle */}
              <div className="hidden sm:flex items-center rounded-lg border border-zinc-700 p-0.5">
                <button
                  onClick={() => setLang("en")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${lang === "en" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                  title="English"
                >EN</button>
                <button
                  onClick={() => setLang("es")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${lang === "es" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                  title="Español"
                >ES</button>
              </div>
              <button
                onClick={() => setShowUnreadOnly((v) => !v)}
                className={`hidden sm:flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${
                  showUnreadOnly
                    ? "border-emerald-600 bg-emerald-900/40 text-emerald-400"
                    : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
                title="Show unread only"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                Unread
              </button>
              <button
                onClick={() => { setSortMode((s) => s === "date" ? "name" : s === "name" ? "color" : "date"); if (selectedCategory) setCustomOrder((prev) => { const next = { ...prev }; delete next[selectedCategory]; localStorage.setItem("stash-custom-order", JSON.stringify(next)); return next; }); }}
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                title={`Sorted by ${sortMode} — click to toggle`}
              >
                {sortMode === "date" ? t.sortDate : sortMode === "name" ? t.sortName : t.sortColor}
              </button>
              {/* Export — desktop */}
              {activeItems.length > 0 && (
                <button
                  onClick={handleExport}
                  className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                  title="Export current view (JSON + Markdown)"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 1v7M3 5l3 3 3-3M1 10h10" />
                  </svg>
                  Export
                </button>
              )}
              <button
                data-tour="add-button"
                onClick={() => setShowAddModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-lg leading-none"
                aria-label={t.addItem}
                title={t.addItem}
              >
                +
              </button>
              <div className="hidden sm:flex items-center rounded-lg border border-zinc-700 p-0.5">
                <button
                  onClick={() => handleSetViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-zinc-700" : "hover:bg-zinc-800"}`}
                  aria-label={t.gridView}
                  title={t.gridView}
                >
                  <GridIcon active={viewMode === "grid"} />
                </button>
                <button
                  onClick={() => handleSetViewMode("list")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-zinc-700" : "hover:bg-zinc-800"}`}
                  aria-label={t.listView}
                  title={t.listView}
                >
                  <ListIcon active={viewMode === "list"} />
                </button>
              </div>
            </div>
          </div>

          {/* Search bar — mobile full-width row */}
          <div data-tour="search-bar" className="mt-3 md:hidden">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Toolbar — mobile only */}
          <div className="mt-2 flex items-center gap-1.5 md:hidden overflow-x-auto pb-0.5">
            <button
              onClick={() => setShowUnreadOnly((v) => !v)}
              className={`flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${
                showUnreadOnly
                  ? "border-emerald-600 bg-emerald-900/40 text-emerald-400"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              Unread
            </button>
            <button
              onClick={() => { setSortMode((s) => s === "date" ? "name" : s === "name" ? "color" : "date"); if (selectedCategory) setCustomOrder((prev) => { const next = { ...prev }; delete next[selectedCategory]; localStorage.setItem("stash-custom-order", JSON.stringify(next)); return next; }); }}
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 transition-colors"
            >
              {sortMode === "date" ? t.sortDate : sortMode === "name" ? t.sortName : t.sortColor}
            </button>
            {activeItems.length > 0 && (
              <button
                onClick={handleExport}
                className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 1v7M3 5l3 3 3-3M1 10h10" />
                </svg>
                Export
              </button>
            )}
            <div className="ml-auto flex shrink-0 items-center rounded-lg border border-zinc-700 p-0.5">
              <button
                onClick={() => handleSetViewMode("grid")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-zinc-700" : ""}`}
                aria-label={t.gridView}
              >
                <GridIcon active={viewMode === "grid"} />
              </button>
              <button
                onClick={() => handleSetViewMode("list")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-zinc-700" : ""}`}
                aria-label={t.listView}
              >
                <ListIcon active={viewMode === "list"} />
              </button>
            </div>
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
                <span className="text-xs text-zinc-600">{t.contributors}</span>
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
                            <span className="ml-1 text-zinc-500">· {t.owner}</span>
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
        <div className="flex-1 overflow-y-auto">
          {/* Stale unread nudge — shown in "All" personal view */}
          {!selectedShare && !selectedCategory && !showAllShared && staleUnreadCount > 0 && !showStaleOnly && !showUnreadOnly && (
            <div className="mx-4 md:mx-6 mt-4 flex items-center gap-3 rounded-lg border border-amber-700/40 bg-amber-900/15 px-3 py-2 text-xs text-amber-300">
              <span>📌</span>
              <span className="flex-1"><strong>{staleUnreadCount}</strong> item{staleUnreadCount > 1 ? "s" : ""} sitting unread for 30+ days</span>
              <button
                onClick={() => setShowStaleOnly(true)}
                className="shrink-0 rounded-md border border-amber-700/60 px-2 py-0.5 hover:bg-amber-800/30 transition-colors"
              >
                Show
              </button>
            </div>
          )}
          {showStaleOnly && (
            <div className="mx-4 md:mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-700/40 bg-amber-900/15 px-3 py-2 text-xs text-amber-300">
              <span>📌</span>
              <span className="flex-1">Showing stale unread items (30+ days)</span>
              <button onClick={() => setShowStaleOnly(false)} className="shrink-0 text-amber-500 hover:text-amber-300">✕ Clear</button>
            </div>
          )}
          <div className="px-4 md:px-6 py-4 md:py-6">
          {/* Category overview — shown in "All" personal view (hidden when searching) */}
          {!selectedCategory && !selectedShare && !selectedCollection && !showAllShared && !searchQuery.trim() ? (
            <CategoryGrid
              categories={categories}
              unreadCounts={unreadCounts}
              membershipItemsMap={categoryMembershipItemsMap}
              mySharedCategoryNames={mySharedCategoryNames}
              sharedCategories={sharedCategories}
              sharedUnreadCounts={sharedUnreadCounts}
              categoryIcons={categoryIcons}
              onSelect={handleCategoryChange}
              onSelectShare={handleSelectShare}
              onDeleteCategory={setConfirmDeleteCategory}
              onRenameCategory={handleRenameCategory}
              onIconPickerOpen={setIconPickerCategory}
            />
          ) : loadingSharedItems || loadingAllShared || loadingCollection ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-zinc-500 text-sm">{t.loading}</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              {searchQuery || selectedTag || selectedSubcategory ? (
                <>
                  <p className="text-zinc-400">{t.noItemsFound}</p>
                  <p className="text-sm text-zinc-600">{t.tryDifferentSearch}</p>
                </>
              ) : selectedShare ? (
                <>
                  <p className="text-2xl">📭</p>
                  <p className="text-zinc-400">{t.nothingHereYet}</p>
                  <p className="text-sm text-zinc-600">{t.beFirstToAdd}</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-400">{t.noItemsFound}</p>
                  <p className="text-sm text-zinc-600">{t.addFirstItem}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-zinc-600">
                {displayedItems.length} {displayedItems.length === 1 ? t.item : t.items}
                {selectedTag && (
                  <span> {t.tagged} <span className="text-zinc-400">#{selectedTag}</span></span>
                )}
              </p>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {displayedItems.map((item, idx) => (
                    <div key={item.id} {...(idx === 0 ? { "data-tour": "item-card" } : {})}>
                    <ItemCard
                      item={item}
                      view="grid"
                      onDelete={handleDelete}
                      onToggleRead={handleToggleRead}
                      onEdit={setEditingItem}
                      onTagClick={setSelectedTag}
                      canReorder={canReorder}
                      canDrag={canDragBase && item.ownerEmail === currentUserEmail}
                      isDragging={dragSrcId === item.id}
                      isDragOver={dragOverId === item.id}
                      onDragStart={() => handleDragStart(
                        item.id,
                        selectedShare ? { shareId: selectedShare.id, membershipId: item.membershipId } : undefined
                      )}
                      onDragOver={() => handleDragOverItem(item.id)}
                      onDrop={() => handleDropOnItem(item.id)}
                      onDragEnd={handleDragEnd}
                      currentUserEmail={currentUserEmail}
                      isSharedView={!!selectedShare || !!currentCategoryShare || showAllShared}
                      shareOwnerEmail={selectedShare?.ownerEmail ?? (currentCategoryShare ? currentUserEmail : undefined)}
                      onRemoveFromShare={handleRemoveFromShare}
                      onAddToShare={setAddToShareItem}
                      hasAvailableShares={sharedCategories.length > 0}
                      siblingItems={activeItems}
                      onAddToCollection={setCollectionPickerItem}
                      shareId={selectedShare?.id ?? currentCategoryShare?.id}
                      autoFocus={item.id === focusItemId}
                      onColorChange={handleColorChange}
                    />
                    </div>
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
                      canDrag={canDragBase && item.ownerEmail === currentUserEmail}
                      isDragging={dragSrcId === item.id}
                      isDragOver={dragOverId === item.id}
                      onDragStart={() => handleDragStart(
                        item.id,
                        selectedShare ? { shareId: selectedShare.id, membershipId: item.membershipId } : undefined
                      )}
                      onDragOver={() => handleDragOverItem(item.id)}
                      onDrop={() => handleDropOnItem(item.id)}
                      onDragEnd={handleDragEnd}
                      currentUserEmail={currentUserEmail}
                      isSharedView={!!selectedShare || !!currentCategoryShare || showAllShared}
                      shareOwnerEmail={selectedShare?.ownerEmail ?? (currentCategoryShare ? currentUserEmail : undefined)}
                      onRemoveFromShare={handleRemoveFromShare}
                      onAddToShare={setAddToShareItem}
                      hasAvailableShares={sharedCategories.length > 0}
                      siblingItems={activeItems}
                      onAddToCollection={setCollectionPickerItem}
                      shareId={selectedShare?.id ?? currentCategoryShare?.id}
                      autoFocus={item.id === focusItemId}
                      onColorChange={handleColorChange}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          </div>

        </div>

      </main>

      {showAddModal && (
        <AddItemModal
          categories={categories}
          onClose={() => { setShowAddModal(false); setSharePreFill(undefined); }}
          onSave={handleAdd}
          shareId={selectedShare?.id}
          shareCategory={selectedShare?.categoryName}
          availableShares={selectedShare ? undefined : allAvailableShares}
          aiAvailable={aiAvailable}
          preFill={sharePreFill}
          defaultCategory={selectedShare ? undefined : (selectedCategory ?? undefined)}
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
          onAdded={() => showToast(t.addedToShared)}
        />
      )}

      {collectionPickerItem && (
        <CollectionPickerModal
          item={collectionPickerItem}
          onClose={() => setCollectionPickerItem(null)}
          onCollectionsChange={setCollections}
        />
      )}

      {/* Category delete confirmation */}
      {confirmDeleteCategory && (() => {
        const catToDelete = categories.find((c) => c.name === confirmDeleteCategory);
        const itemCount = catToDelete?.items.length ?? 0;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl">
              <h2 className="text-base font-semibold text-zinc-100">{t.deleteCategoryTitle}</h2>
              <p className="text-sm text-zinc-400">{t.deleteCategoryNote}</p>
              <p className="text-xs font-medium text-zinc-300">
                &quot;{titleCase(confirmDeleteCategory)}&quot;
                {itemCount > 0 && (
                  <span className="ml-1 text-red-400">({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteCategory(null)}
                  className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={async () => {
                    if (selectedCategory === confirmDeleteCategory) handleCategoryChange(null);
                    setConfirmDeleteCategory(null);
                    await fetch(`/api/categories/${encodeURIComponent(confirmDeleteCategory)}`, { method: "DELETE" });
                    setCategories((prev) => prev.filter((c) => c.name !== confirmDeleteCategory));
                    showToast(t.categoryRemoved);
                  }}
                  className="flex-1 rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-800 transition-colors"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <Toast key={toast.id} message={toast.msg} onDone={() => setToast(null)} />}

      {iconPickerCategory && (
        <IconPickerModal
          categoryName={iconPickerCategory}
          currentIcon={categoryIcons[iconPickerCategory] ?? ""}
          onSave={async (icon) => { await handleIconSave(iconPickerCategory, icon); }}
          onClose={() => setIconPickerCategory(null)}
        />
      )}

      {showTour && currentUserEmail && (
        <TourOverlay
          onComplete={handleTourComplete}
          onStep={(stepId) => {
            if (stepId === "sidebar") setSidebarOpen(true);
            else setSidebarOpen(false);
          }}
        />
      )}
    </div>
  );
}
