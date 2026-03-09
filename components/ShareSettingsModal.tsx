"use client";

import { useState, useEffect } from "react";

interface Friend {
  email: string;
  name: string | null;
}

interface ShareSettingsModalProps {
  categoryName: string;
  existingShare?: {
    id: string;
    mode: "whitelist" | "public";
    allowedEmails: string[];
  } | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

type ShareMode = "none" | "whitelist" | "public";

export default function ShareSettingsModal({
  categoryName,
  existingShare,
  onClose,
  onSaved,
  onDeleted,
}: ShareSettingsModalProps) {
  const [mode, setMode] = useState<ShareMode>(existingShare?.mode ?? "none");
  const [allowedEmails, setAllowedEmails] = useState<string[]>(
    existingShare?.allowedEmails ?? []
  );
  const [friends, setFriends] = useState<Friend[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => {
        const accepted = (data.friends ?? []).filter(
          (f: { status: string; email: string; name: string | null }) =>
            f.status === "accepted"
        );
        setFriends(accepted);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (mode === "none" && existingShare) {
        // Delete the share
        const res = await fetch(`/api/sharing/${existingShare.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to unshare");
        onSaved();
        onDeleted?.();
        onClose();
        return;
      } else if (mode !== "none") {
        const res = existingShare
          ? await fetch(`/api/sharing/${existingShare.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode, allowedEmails }),
            })
          : await fetch("/api/sharing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ categoryName, mode, allowedEmails }),
            });
        if (!res.ok) throw new Error("Failed to save share settings");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleEmail(email: string) {
    setAllowedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  }

  const inputCls =
    "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors w-full";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Share settings
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {categoryName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex flex-col gap-2">
          {(
            [
              { value: "none", label: "Not shared", desc: "Only you can see this category" },
              { value: "whitelist", label: "Friends only", desc: "Specific friends can view and contribute" },
              { value: "public", label: "Public", desc: "Any logged-in user can view and contribute" },
            ] as { value: ShareMode; label: string; desc: string }[]
          ).map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                mode === value
                  ? "border-zinc-500 bg-zinc-800"
                  : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/40"
              }`}
            >
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                  mode === value
                    ? "border-zinc-300"
                    : "border-zinc-600"
                }`}
              >
                {mode === value && (
                  <span className="h-2 w-2 rounded-full bg-zinc-300" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Whitelist friends */}
        {mode === "whitelist" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-400">
              Select friends who can access this category:
            </p>
            {friends.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">
                No friends yet — add friends from the user menu first.
              </p>
            ) : (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {friends.map((f) => (
                  <label
                    key={f.email}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={allowedEmails.includes(f.email)}
                      onChange={() => toggleEmail(f.email)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 accent-zinc-300"
                    />
                    <div>
                      {f.name && (
                        <p className="text-sm text-zinc-200">{f.name}</p>
                      )}
                      <p className="text-xs text-zinc-500">{f.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
