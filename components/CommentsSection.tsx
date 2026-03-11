"use client";

import { useState, useRef } from "react";

interface Comment {
  id: string;
  userEmail: string;
  userName: string | null;
  content: string;
  createdAt: string;
}

interface CommentsSectionProps {
  itemId: string;
  comments: Comment[];
  currentUserEmail: string;
  onCommentsChange: (comments: Comment[]) => void;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CommentsSection({
  itemId,
  comments,
  currentUserEmail,
  onCommentsChange,
}: CommentsSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const content = inputValue.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/items/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        onCommentsChange([...comments, data.comment]);
        setInputValue("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(`/api/items/${itemId}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      onCommentsChange(comments.filter((c) => c.id !== commentId));
    }
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditContent(c.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function handleSaveEdit(commentId: string) {
    const content = editContent.trim();
    if (!content || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        onCommentsChange(comments.map((c) => c.id === commentId ? data.comment : c));
        setEditingId(null);
        setEditContent("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      {comments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {comments.map((c) => {
            const isOwn = c.userEmail === currentUserEmail;
            const displayName = c.userName ?? c.userEmail.split("@")[0];
            const isEditing = editingId === c.id;

            return (
              <div key={c.id} className="group flex gap-2 items-start">
                <div className="flex-1 min-w-0 rounded-lg bg-zinc-900 px-2.5 py-1.5">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-300">{displayName}</span>
                    <span className="text-[10px] text-zinc-600">{formatRelative(c.createdAt)}</span>
                  </div>
                  {isEditing ? (
                    <div className="mt-1 flex flex-col gap-1.5">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(c.id); }
                          if (e.key === "Escape") cancelEdit();
                          e.stopPropagation();
                        }}
                        rows={2}
                        autoFocus
                        className="w-full resize-none rounded-lg bg-zinc-800 border border-zinc-600 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSaveEdit(c.id)}
                          disabled={!editContent.trim() || saving}
                          className="rounded-md bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-md px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed break-words">{c.content}</p>
                  )}
                </div>

                {/* Own comment actions */}
                {isOwn && !isEditing && (
                  <div className="flex flex-col gap-0.5 mt-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all shrink-0">
                    <button
                      onClick={() => startEdit(c)}
                      className="flex h-5 w-5 items-center justify-center rounded text-[10px] text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      aria-label="Edit comment"
                      title="Edit comment"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-[10px] text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
            e.stopPropagation();
          }}
          placeholder="Add a comment…"
          rows={1}
          className="flex-1 resize-none rounded-lg bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || submitting}
          className="shrink-0 rounded-lg bg-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "…" : "Post"}
        </button>
      </form>
    </div>
  );
}
