"use client";

import { useState, useEffect, useRef } from "react";
import { Item, Attachment } from "@/lib/data";
import ThumbsVoting from "./ThumbsVoting";
import CommentsSection from "./CommentsSection";

interface Comment {
  id: string;
  userEmail: string;
  userName: string | null;
  content: string;
  createdAt: string;
}

interface Interactions {
  myVote: 1 | -1 | null;
  upCount: number;
  downCount: number;
  comments: Comment[];
}

interface ItemCardProps {
  item: Item;
  view: "grid" | "list";
  onDelete: (id: string) => void;
  onToggleRead: (id: string, read: boolean) => void;
  onEdit: (item: Item) => void;
  onTagClick?: (tag: string) => void;
  canReorder?: boolean;
  canDrag?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  currentUserEmail?: string;
  // Sharing actions
  isSharedView?: boolean;
  shareOwnerEmail?: string;
  onRemoveFromShare?: (membershipId: string) => void;
  onAddToShare?: (item: Item) => void;
  hasAvailableShares?: boolean;
  // Related items (sibling items in same view for similarity scoring)
  siblingItems?: Item[];
  // Collections
  onAddToCollection?: (item: Item) => void;
  // Share context — included in copy-link URL so shared users land in the right view
  shareId?: string;
  // Auto-expand and scroll (used when navigating from a push notification)
  autoFocus?: boolean;
}

function docIconColor(att: Attachment): string {
  const ext = att.name.split(".").pop()?.toLowerCase() ?? "";
  if (att.type === "pdf") return "text-red-400";
  if (ext === "doc" || ext === "docx") return "text-blue-400";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "text-emerald-400";
  if (ext === "ppt" || ext === "pptx") return "text-orange-400";
  return "text-zinc-400";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  manual: "Manual",
};

function AttachmentsPreview({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att, i) => (
        att.type === "image" ? (
          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={att.url} alt={att.name} className="h-20 w-20 rounded-lg object-cover border border-zinc-700 hover:border-zinc-500 transition-colors" />
          </a>
        ) : (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${docIconColor(att)}`}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="max-w-[140px] truncate">{att.name}</span>
          </a>
        )
      ))}
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3" cy="2" r="1.2" />
      <circle cx="7" cy="2" r="1.2" />
      <circle cx="3" cy="7" r="1.2" />
      <circle cx="7" cy="7" r="1.2" />
      <circle cx="3" cy="12" r="1.2" />
      <circle cx="7" cy="12" r="1.2" />
    </svg>
  );
}

function computeRelated(item: Item, siblings: Item[]): Item[] {
  return siblings
    .filter((s) => s.id !== item.id)
    .map((s) => {
      let score = 0;
      if (s.category === item.category) score += 3;
      if (s.subcategory && s.subcategory === item.subcategory) score += 2;
      for (const tag of item.tags) if (s.tags.includes(tag)) score += 2;
      if (s.source === item.source && item.source !== "manual") score += 1;
      return { item: s, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.item);
}

export default function ItemCard({
  item, view, onDelete, onToggleRead, onEdit, onTagClick,
  canReorder, canDrag, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
  currentUserEmail, isSharedView, shareOwnerEmail, onRemoveFromShare, onAddToShare,
  hasAvailableShares, siblingItems, onAddToCollection, shareId, autoFocus,
}: ItemCardProps) {
  const isItemOwner = item.ownerEmail === currentUserEmail;
  const isShareOwner = shareOwnerEmail === currentUserEmail;
  // In personal view: owner can edit/delete. In shared view: only item owner can edit.
  const canModify = isItemOwner;
  // Can remove from share: item owner OR share owner, only when there's a membership
  const canRemoveFromShare = isSharedView && !!item.membershipId && (isItemOwner || isShareOwner);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [interactions, setInteractions] = useState<Interactions | null>(null);
  const [related, setRelated] = useState<Item[] | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  // When autoFocus becomes true (push/in-app notification click): expand, load, scroll
  useEffect(() => {
    if (!autoFocus) return;
    setExpanded(true);
    if (!item.read) onToggleRead(item.id, true);
    fetch(`/api/items/${item.id}/interactions`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setInteractions(data); })
      .catch(() => {});
    setTimeout(() => {
      articleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, [autoFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCardClick() {
    if (!confirming) {
      // Don't collapse while the user has text selected (they're trying to copy)
      if (expanded && window.getSelection()?.toString()) return;
      const opening = !expanded;
      setExpanded(opening);
      // Auto-mark as read when opening the card (like email)
      if (opening && !item.read) onToggleRead(item.id, true);
      // Lazy-load interactions + related items on first expand
      if (opening && !interactions) {
        fetch(`/api/items/${item.id}/interactions`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data) setInteractions(data); })
          .catch(() => {});
      }
      if (opening && !related && siblingItems) {
        setRelated(computeRelated(item, siblingItems));
      }
    }
  }

  // ESC to collapse
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Click outside to collapse
  useEffect(() => {
    if (!expanded) return;
    function onClickOutside(e: MouseEvent) {
      if (articleRef.current && !articleRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", onClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [expanded]);

  const attachmentBadge = item.attachments && item.attachments.length > 0 ? (
    <span title={`${item.attachments.length} attachment${item.attachments.length > 1 ? "s" : ""}`} className="text-zinc-600 text-xs">
      📎{item.attachments.length > 1 ? ` ${item.attachments.length}` : ""}
    </span>
  ) : null;

  const favicon = item.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${getDomain(item.url)}&sz=16`}
      alt=""
      width={16}
      height={16}
      className="shrink-0 rounded-sm"
    />
  ) : null;

  const openLink = item.url && !confirming ? (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 rounded-md bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-600 hover:text-white transition-colors"
    >
      Open ↗
    </a>
  ) : null;

  // In shared view: "remove from share" replaces delete for membership items
  // In shared view, owner can still delete their own items; only hides for non-owner items
  const deleteButton = !confirming && canModify && (!isSharedView || isShareOwner) ? (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Delete item"
    >
      ✕
    </button>
  ) : null;

  const removeFromShareButton = !confirming && canRemoveFromShare ? (
    <button
      onClick={(e) => { e.stopPropagation(); onRemoveFromShare!(item.membershipId!); }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Remove from shared category"
      title="Remove from shared category"
    >
      ✕
    </button>
  ) : null;

  const addToShareButton = !confirming && !isSharedView && hasAvailableShares && isItemOwner ? (
    <button
      onClick={(e) => { e.stopPropagation(); onAddToShare?.(item); }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Add to shared category"
      title="Add to shared category"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="2" r="1.5" />
        <circle cx="9" cy="10" r="1.5" />
        <circle cx="2" cy="6" r="1.5" />
        <line x1="3.5" y1="6" x2="7.5" y2="2.5" />
        <line x1="3.5" y1="6" x2="7.5" y2="9.5" />
      </svg>
    </button>
  ) : null;

  const readButton = !confirming ? (
    <button
      onClick={(e) => { e.stopPropagation(); onToggleRead(item.id, !item.read); }}
      className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
        item.read
          ? "text-emerald-500 opacity-70 hover:opacity-100"
          : "text-zinc-600 opacity-20 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300"
      }`}
      aria-label={item.read ? "Mark as unread" : "Mark as read"}
      title={item.read ? "Mark as unread" : "Mark as read"}
    >
      ✓
    </button>
  ) : null;

  const editButton = !confirming && canModify ? (
    <button
      onClick={(e) => { e.stopPropagation(); if (!item.read) onToggleRead(item.id, true); onEdit(item); }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Edit item"
      title="Edit item"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
        <path d="M8.5 1.5a1.5 1.5 0 0 1 2.121 2.121L9.5 4.743 7.257 2.5 8.5 1.5zM6.5 3.257 1 8.757V11h2.243l5.5-5.5L6.5 3.257z"/>
      </svg>
    </button>
  ) : null;

  const copyLinkButton = !confirming ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const parts = [
          `itemId=${item.id}`,
          shareId && `shareId=${shareId}`,
          `categoryName=${item.category}`,
        ].filter(Boolean).join("&");
        const url = `${window.location.origin}/?${parts}`;
        navigator.clipboard.writeText(url).then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 1500);
        });
      }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Copy link"
      title={linkCopied ? "Copied!" : "Copy link"}
    >
      {linkCopied ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
          <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 7.5a2.5 2.5 0 0 0 3.536 0l2-2a2.5 2.5 0 0 0-3.536-3.536L5.5 3" />
          <path d="M7.5 4.5a2.5 2.5 0 0 0-3.536 0l-2 2A2.5 2.5 0 0 0 5.5 10l1-1" />
        </svg>
      )}
    </button>
  ) : null;

  const copyTextButton = !confirming ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const parts = [item.title, item.summary, item.content].filter(Boolean).join("\n\n");
        navigator.clipboard.writeText(parts).then(() => {
          setTextCopied(true);
          setTimeout(() => setTextCopied(false), 1500);
        });
      }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Copy text"
      title={textCopied ? "Copied!" : "Copy text"}
    >
      {textCopied ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
          <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  ) : null;

  const collectionButton = !confirming && onAddToCollection ? (
    <button
      onClick={(e) => { e.stopPropagation(); onAddToCollection(item); }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Add to collection"
      title="Add to collection"
    >
      <svg width="11" height="11" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 1h8a1 1 0 0 1 1 1v10l-4.5-2.5L2 12V2a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  ) : null;

  const confirmFooter = (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-700"
    >
      <span className="text-xs text-zinc-400">Remove this item?</span>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="rounded-md bg-red-900/70 px-2.5 py-1 text-xs text-red-300 hover:bg-red-800 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );

  const dragHandleEl = (canReorder || canDrag) ? (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData("text/plain", item.id);
        if (articleRef.current) {
          e.dataTransfer.setDragImage(articleRef.current, 20, 20);
        }
        onDragStart?.();
      }}
      onDragEnd={(e) => { e.stopPropagation(); onDragEnd?.(); }}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-center text-zinc-500 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-all shrink-0"
      aria-label={canReorder ? "Drag to reorder" : "Drag to move to another category"}
    >
      <GripIcon />
    </div>
  ) : null;

  const colorGrid: Record<string, string> = {
    amber: "bg-amber-800/40 border-amber-600/70",
    blue:  "bg-blue-800/40 border-blue-600/70",
    rose:  "bg-rose-800/40 border-rose-600/70",
  };
  const colorList: Record<string, string> = {
    amber: "bg-amber-900/50 border-amber-700/60",
    blue:  "bg-blue-900/50 border-blue-700/60",
    rose:  "bg-rose-900/50 border-rose-700/60",
  };
  const baseGrid = item.color ? colorGrid[item.color] : "bg-zinc-800/50 border-zinc-700/50";
  const baseList = item.color ? colorList[item.color] : "";

  /* ── GRID VIEW ─────────────────────────────────────────────── */
  if (view === "grid") {
    return (
      <article
        ref={articleRef}
        onClick={handleCardClick}
        onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop?.(); }}
        className={`group flex flex-col gap-3 rounded-xl border p-4 transition-all cursor-pointer ${baseGrid} ${
          expanded ? "border-zinc-500!" : isDragOver ? "border-zinc-400!" : ""
        } ${isDragging ? "opacity-30" : ""}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {dragHandleEl}
            {favicon}
            {attachmentBadge}
            <h3 className={`text-sm leading-snug line-clamp-2 break-words ${item.read ? "font-medium text-zinc-500" : "font-bold text-zinc-100"}`}>
              {item.title || <span className="italic text-zinc-600">Untitled</span>}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {readButton}
            {editButton}
            {collectionButton}
            {copyTextButton}
            {copyLinkButton}
            {addToShareButton}
            {deleteButton}
            {removeFromShareButton}
            {openLink}
          </div>
        </div>

        {/* Summary */}
        <p className={`text-xs text-zinc-400 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
          {item.summary}
        </p>

        {/* Extended content */}
        {expanded && item.content && (
          <p className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-700 pt-2 whitespace-pre-wrap">
            {item.content}
          </p>
        )}

        {/* Attachments */}
        {expanded && item.attachments && item.attachments.length > 0 && (
          <div className="border-t border-zinc-700 pt-2">
            <AttachmentsPreview attachments={item.attachments} />
          </div>
        )}

        {/* Ratings & Comments */}
        {expanded && interactions && currentUserEmail && (
          <div className="border-t border-zinc-700 pt-2 flex flex-col gap-2">
            <ThumbsVoting
              itemId={item.id}
              myVote={interactions.myVote}
              upCount={interactions.upCount}
              downCount={interactions.downCount}
              onVoteChange={(myVote, upCount, downCount) =>
                setInteractions((prev) => prev ? { ...prev, myVote, upCount, downCount } : prev)
              }
            />
            <CommentsSection
              itemId={item.id}
              comments={interactions.comments}
              currentUserEmail={currentUserEmail}
              onCommentsChange={(comments) =>
                setInteractions((prev) => prev ? { ...prev, comments } : prev)
              }
            />
          </div>
        )}

        {/* Related items */}
        {expanded && related && related.length > 0 && (
          <div className="border-t border-zinc-700 pt-2 flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Related</p>
            {related.map((r) => (
              <button
                key={r.id}
                onClick={(e) => { e.stopPropagation(); onTagClick?.(r.tags[0] ?? ""); }}
                className="flex items-start gap-1.5 rounded-lg p-1.5 text-left hover:bg-zinc-700/50 transition-colors"
              >
                <span className="text-zinc-600 text-[10px] mt-0.5 shrink-0">↗</span>
                <span className="text-xs text-zinc-400 leading-snug line-clamp-2">{r.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        {confirming ? confirmFooter : (
          <div className="flex flex-wrap items-center gap-2 mt-auto">
            <span className="rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300">
              {item.subcategory}
            </span>
            {item.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                #{tag}
              </button>
            ))}
            <span className="ml-auto text-xs text-zinc-600">{formatDate(item.dateAdded)}</span>
          </div>
        )}

        {/* Source */}
        {!confirming && item.source && item.source !== "manual" && (
          <p className="text-xs text-zinc-600">
            via {SOURCE_LABELS[item.source] ?? item.source}
          </p>
        )}

        {/* Added by */}
        {!confirming && item.addedBy && item.addedBy !== currentUserEmail && (
          <p className="text-xs text-zinc-600">
            added by {item.addedBy.split("@")[0]}
          </p>
        )}
      </article>
    );
  }

  /* ── LIST VIEW ─────────────────────────────────────────────── */
  return (
    <article
      ref={articleRef}
      onClick={handleCardClick}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop?.(); }}
      className={`group flex flex-col rounded-lg border px-4 py-2.5 transition-all cursor-pointer ${baseList || "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"} ${
        expanded ? "border-zinc-600! bg-zinc-800/60" : isDragOver ? "border-zinc-400!" : ""
      } ${isDragging ? "opacity-30" : ""}`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 min-w-0">
        {dragHandleEl}
        {favicon}

        <span className={`flex-1 text-sm truncate ${item.read ? "font-normal text-zinc-500" : "font-bold text-zinc-100"}`}>
          {item.title || <span className="italic text-zinc-600">Untitled</span>}
        </span>

        <span className="hidden sm:block shrink-0 rounded-full bg-zinc-700/60 px-2 py-0.5 text-xs text-zinc-400">
          {item.subcategory}
        </span>

        {item.tags[0] && (
          <span className="hidden md:block shrink-0 text-xs text-zinc-600">
            #{item.tags[0]}
          </span>
        )}

        <span className="hidden sm:block shrink-0 text-xs text-zinc-600 w-24 text-right">
          {formatDate(item.dateAdded)}
        </span>

        {/* Actions */}
        {confirming ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-xs text-zinc-400">Remove?</span>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-md bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="rounded-md bg-red-900/70 px-2 py-0.5 text-xs text-red-300 hover:bg-red-800 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            {readButton}
            {editButton}
            {collectionButton}
            {copyTextButton}
            {copyLinkButton}
            {addToShareButton}
            {deleteButton}
            {removeFromShareButton}
            {openLink}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-zinc-700/60 flex flex-col gap-2">
          <p className="text-xs text-zinc-400 leading-relaxed">{item.summary}</p>
          {item.content && (
            <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap">
              {item.content}
            </p>
          )}
          {item.attachments && item.attachments.length > 0 && (
            <AttachmentsPreview attachments={item.attachments} />
          )}
          {interactions && currentUserEmail && (
            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-700/60">
              <ThumbsVoting
                itemId={item.id}
                myVote={interactions.myVote}
                upCount={interactions.upCount}
                downCount={interactions.downCount}
                onVoteChange={(myVote, upCount, downCount) =>
                  setInteractions((prev) => prev ? { ...prev, myVote, upCount, downCount } : prev)
                }
              />
              <CommentsSection
                itemId={item.id}
                comments={interactions.comments}
                currentUserEmail={currentUserEmail}
                onCommentsChange={(comments) =>
                  setInteractions((prev) => prev ? { ...prev, comments } : prev)
                }
              />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {item.tags.map((tag) => (
              <button
                key={tag}
                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                #{tag}
              </button>
            ))}
            {item.source && item.source !== "manual" && (
              <span className="text-xs text-zinc-600">
                via {SOURCE_LABELS[item.source] ?? item.source}
              </span>
            )}
            {item.addedBy && item.addedBy !== currentUserEmail && (
              <span className="text-xs text-zinc-600">
                added by {item.addedBy.split("@")[0]}
              </span>
            )}
          </div>
          {related && related.length > 0 && (
            <div className="flex flex-col gap-0.5 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-0.5">Related</p>
              {related.map((r) => (
                <div key={r.id} className="flex items-start gap-1.5 text-xs text-zinc-500">
                  <span className="shrink-0 text-zinc-700">↗</span>
                  <span className="line-clamp-1">{r.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
