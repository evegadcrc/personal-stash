"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FriendData {
  email: string;
  name: string | null;
  friendshipId: string;
  status: "accepted" | "pending";
  direction: "sent" | "received";
}

interface ItemNotification {
  id: string;
  fromEmail: string;
  fromName: string | null;
  itemId: string | null;
  itemTitle: string | null;
  categoryName: string | null;
  shareId: string | null;
  createdAt: string;
}

interface NotificationsPanelProps {
  onClose: () => void;
  onPendingChange: (count: number) => void;
  onOpenFriends: () => void;
  onNotifCountChange?: (count: number) => void;
  onOpenItem?: (itemId: string | null, shareId: string | null, categoryName: string | null) => void;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPanel({
  onClose,
  onPendingChange,
  onOpenFriends,
  onNotifCountChange,
  onOpenItem,
}: NotificationsPanelProps) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<FriendData[]>([]);
  const [notifications, setNotifications] = useState<ItemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [dismissingAll, setDismissingAll] = useState(false);

  async function load() {
    try {
      const [friendRes, notifRes] = await Promise.all([
        fetch("/api/friends"),
        fetch("/api/notifications"),
      ]);
      const friendData = await friendRes.json() as { friends: FriendData[] };
      const notifData = await notifRes.json() as { notifications: ItemNotification[] };
      const pending = (friendData.friends ?? []).filter(
        (f) => f.status === "pending" && f.direction === "received"
      );
      setRequests(pending);
      onPendingChange(pending.length);
      const notifs = notifData.notifications ?? [];
      setNotifications(notifs);
      onNotifCountChange?.(notifs.length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRespond(friendshipId: string, action: "accept" | "decline") {
    setResponding(friendshipId);
    try {
      await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setResponding(null);
    }
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    onNotifCountChange?.(updated.length);
  }

  async function handleDismissAll() {
    setDismissingAll(true);
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      setNotifications([]);
      onNotifCountChange?.(0);
    } finally {
      setDismissingAll(false);
    }
  }

  function handleNotifClick(n: ItemNotification) {
    if (n.itemId) {
      // Remove from panel state; handleOpenItem handles badge + DB dismissal by itemId
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      onOpenItem?.(n.itemId, n.shareId, n.categoryName);
    } else {
      handleDismiss(n.id);
    }
    onClose();
  }

  const isEmpty = requests.length === 0 && notifications.length === 0;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-10 z-20 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-200">{t.notifications}</p>
          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <button
                onClick={handleDismissAll}
                disabled={dismissingAll}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                {dismissingAll ? "…" : "Clear all"}
              </button>
            )}
            <button
              onClick={onOpenFriends}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t.manageFriends}
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-4 text-xs text-zinc-500">{t.loading}</p>
          ) : isEmpty ? (
            <p className="px-4 py-4 text-xs text-zinc-600">{t.noPendingNotifications}</p>
          ) : (
            <>
              {/* Friend requests */}
              {requests.map((r) => (
                <div key={r.friendshipId} className="px-4 py-2.5 hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/60 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300">
                        <span className="font-medium">{r.name ?? r.email}</span>{" "}
                        {t.wantsToBeeFriends}
                      </p>
                      {r.name && <p className="text-xs text-zinc-600 truncate">{r.email}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0 mt-0.5">
                      <button
                        onClick={() => handleRespond(r.friendshipId, "accept")}
                        disabled={responding === r.friendshipId}
                        className="rounded-md bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300 hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                      >
                        {responding === r.friendshipId ? "…" : t.accept}
                      </button>
                      <button
                        onClick={() => handleRespond(r.friendshipId, "decline")}
                        disabled={responding === r.friendshipId}
                        className="rounded-md bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                      >
                        {responding === r.friendshipId ? "…" : t.decline}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Item notifications */}
              {notifications.map((n) => {
                const actor = n.fromName ?? n.fromEmail.split("@")[0];
                return (
                  <div
                    key={n.id}
                    className="group flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/60 last:border-0 cursor-pointer"
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        <span className="font-medium">{actor}</span>
                        {" added "}
                        <span className="text-zinc-100 font-medium line-clamp-1">{n.itemTitle ?? "an item"}</span>
                        {n.categoryName && (
                          <> to <span className="text-zinc-400">{n.categoryName}</span></>
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{formatRelative(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(n.id); }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 mt-0.5 flex h-5 w-5 items-center justify-center rounded text-[10px] text-zinc-600 hover:text-zinc-300 transition-all"
                      aria-label="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
