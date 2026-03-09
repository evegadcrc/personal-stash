"use client";

import { useState, useEffect } from "react";

interface FriendData {
  email: string;
  name: string | null;
  avatar: string | null;
  friendshipId: string;
  status: "accepted" | "pending";
  direction: "sent" | "received";
}

interface FriendsModalProps {
  onClose: () => void;
  onPendingChange: (count: number) => void;
}

export default function FriendsModal({ onClose, onPendingChange }: FriendsModalProps) {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadFriends() {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json() as { friends: FriendData[] };
      setFriends(data.friends ?? []);
      const pending = (data.friends ?? []).filter(
        (f) => f.status === "pending" && f.direction === "received"
      ).length;
      onPendingChange(pending);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFriends(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSendRequest() {
    setError("");
    setSuccessMsg("");
    setSending(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: emailInput.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to send request");
      }
      setSuccessMsg(`Friend request sent to ${emailInput.trim()}`);
      setEmailInput("");
      await loadFriends();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleRespond(friendshipId: string, action: "accept" | "decline") {
    await fetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadFriends();
  }

  async function handleRemove(friendshipId: string) {
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    await loadFriends();
  }

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingReceived = friends.filter(
    (f) => f.status === "pending" && f.direction === "received"
  );
  const pendingSent = friends.filter(
    (f) => f.status === "pending" && f.direction === "sent"
  );

  const inputCls =
    "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors flex-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">Friends</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Add friend */}
        <div className="shrink-0 flex flex-col gap-2">
          <p className="text-xs text-zinc-400">Add friend by email</p>
          <div className="flex gap-2">
            <input
              className={inputCls}
              type="email"
              placeholder="friend@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && emailInput.trim() && handleSendRequest()}
            />
            <button
              onClick={handleSendRequest}
              disabled={sending || !emailInput.trim()}
              className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 transition-colors shrink-0"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {successMsg && <p className="text-xs text-emerald-400">{successMsg}</p>}
        </div>

        <div className="overflow-y-auto flex flex-col gap-4 flex-1">
          {loading ? (
            <p className="text-xs text-zinc-500">Loading…</p>
          ) : (
            <>
              {/* Pending received */}
              {pendingReceived.length > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Requests ({pendingReceived.length})
                  </p>
                  {pendingReceived.map((f) => (
                    <div
                      key={f.friendshipId}
                      className="flex items-center justify-between gap-3 rounded-lg bg-zinc-800/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        {f.name && (
                          <p className="text-sm font-medium text-zinc-200 truncate">{f.name}</p>
                        )}
                        <p className="text-xs text-zinc-500 truncate">{f.email}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleRespond(f.friendshipId, "accept")}
                          className="rounded-md bg-emerald-900/60 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-800 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(f.friendshipId, "decline")}
                          className="rounded-md bg-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-600 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Accepted friends */}
              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Friends ({accepted.length})
                </p>
                {accepted.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">No friends yet</p>
                ) : (
                  accepted.map((f) => (
                    <div
                      key={f.friendshipId}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {f.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={f.avatar}
                            alt={f.name ?? f.email}
                            className="h-7 w-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300 shrink-0">
                            {(f.name ?? f.email).charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          {f.name && (
                            <p className="text-sm font-medium text-zinc-200 truncate">{f.name}</p>
                          )}
                          <p className="text-xs text-zinc-500 truncate">{f.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(f.friendshipId)}
                        className="shrink-0 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </section>

              {/* Pending sent */}
              {pendingSent.length > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Sent requests ({pendingSent.length})
                  </p>
                  {pendingSent.map((f) => (
                    <div
                      key={f.friendshipId}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-400 truncate">{f.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-zinc-600">Pending</span>
                        <button
                          onClick={() => handleRemove(f.friendshipId)}
                          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
