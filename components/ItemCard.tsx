"use client";

import { useState } from "react";
import { Item } from "@/lib/data";

interface ItemCardProps {
  item: Item;
  view: "grid" | "list";
  onDelete: (id: string) => void;
  onToggleRead: (id: string, read: boolean) => void;
  onEdit: (item: Item) => void;
  onTagClick?: (tag: string) => void;
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

export default function ItemCard({ item, view, onDelete, onToggleRead, onEdit, onTagClick }: ItemCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleCardClick() {
    if (!confirming) setExpanded((prev) => !prev);
  }

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

  const deleteButton = !confirming ? (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Delete item"
    >
      ✕
    </button>
  ) : null;

  const readButton = !confirming ? (
    <button
      onClick={(e) => { e.stopPropagation(); onToggleRead(item.id, !item.read); }}
      className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
        item.read
          ? "text-emerald-500 opacity-60 hover:opacity-100"
          : "text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 hover:text-zinc-300"
      }`}
      aria-label={item.read ? "Mark as unread" : "Mark as read"}
      title={item.read ? "Mark as unread" : "Mark as read"}
    >
      ✓
    </button>
  ) : null;

  const editButton = !confirming ? (
    <button
      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 hover:text-zinc-300 transition-all"
      aria-label="Edit item"
      title="Edit item"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
        <path d="M8.5 1.5a1.5 1.5 0 0 1 2.121 2.121L9.5 4.743 7.257 2.5 8.5 1.5zM6.5 3.257 1 8.757V11h2.243l5.5-5.5L6.5 3.257z"/>
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

  /* ── GRID VIEW ─────────────────────────────────────────────── */
  if (view === "grid") {
    return (
      <article
        onClick={handleCardClick}
        className={`group flex flex-col gap-3 rounded-xl bg-zinc-800/50 border p-4 transition-all cursor-pointer ${
          expanded ? "border-zinc-500" : "border-zinc-700/50 hover:border-zinc-600"
        } ${item.read ? "opacity-50 hover:opacity-80" : ""}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {favicon}
            <h3 className={`text-sm font-semibold leading-snug line-clamp-2 ${item.read ? "text-zinc-400" : "text-zinc-100"}`}>
              {item.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {readButton}
            {editButton}
            {deleteButton}
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
      </article>
    );
  }

  /* ── LIST VIEW ─────────────────────────────────────────────── */
  return (
    <article
      onClick={handleCardClick}
      className={`group flex flex-col rounded-lg border px-4 py-2.5 transition-all cursor-pointer ${
        expanded ? "border-zinc-600 bg-zinc-800/60" : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
      } ${item.read ? "opacity-50 hover:opacity-80" : ""}`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 min-w-0">
        {favicon}

        <span className={`flex-1 text-sm truncate font-medium ${item.read ? "text-zinc-400" : "text-zinc-100"}`}>
          {item.title}
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
            {deleteButton}
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
          </div>
        </div>
      )}
    </article>
  );
}
