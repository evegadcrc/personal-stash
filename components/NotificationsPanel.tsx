"use client";

import { useState, useEffect } from "react";

interface FriendData {
  email: string;
  name: string | null;
  friendshipId: string;
  status: "accepted" | "pending";
  direction: "sent" | "received";
}

interface NotificationsPanelProps {
  onClose: () => void;
  onPendingChange: (count: number) => void;
  onOpenFriends: () => void;
}

export default function NotificationsPanel({
  onClose,
  onPendingChange,
  onOpenFriends,
}: NotificationsPanelProps) {
  const [requests, setRequests] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  async function loadRequests() {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json() as { friends: FriendData[] };
      const pending = (data.friends ?? []).filter(
        (f) => f.status === "pending" && f.direction === "received"
      );
      setRequests(pending);
      onPendingChange(pending.length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRequests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRespond(friendshipId: string, action: "accept" | "decline") {
    setResponding(friendshipId);
    try {
      await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await loadRequests();
    } finally {
      setResponding(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-200">Notifications</p>
          <button
            onClick={onOpenFriends}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Manage friends →
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {loading ? (
            <p className="px-4 py-3 text-xs text-zinc-500">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="px-4 py-3 text-xs text-zinc-600">No pending notifications</p>
          ) : (
            requests.map((r) => (
              <div key={r.friendshipId} className="px-4 py-2.5 hover:bg-zinc-800/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-300">
                      <span className="font-medium">{r.name ?? r.email}</span>{" "}
                      wants to be friends
                    </p>
                    {r.name && (
                      <p className="text-xs text-zinc-600 truncate">{r.email}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 mt-0.5">
                    <button
                      onClick={() => handleRespond(r.friendshipId, "accept")}
                      disabled={responding === r.friendshipId}
                      className="rounded-md bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300 hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                    >
                      {responding === r.friendshipId ? "…" : "Accept"}
                    </button>
                    <button
                      onClick={() => handleRespond(r.friendshipId, "decline")}
                      disabled={responding === r.friendshipId}
                      className="rounded-md bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                    >
                      {responding === r.friendshipId ? "…" : "Decline"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
