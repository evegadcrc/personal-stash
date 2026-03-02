"use client";

import { Item } from "@/lib/data";

interface ItemCardProps {
  item: Item;
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

export default function ItemCard({ item }: ItemCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 hover:border-zinc-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {item.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(item.url)}&sz=16`}
              alt=""
              width={16}
              height={16}
              className="shrink-0 rounded-sm"
            />
          )}
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">
            {item.title}
          </h3>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-600 hover:text-white transition-colors"
          >
            Open ↗
          </a>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{item.summary}</p>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 mt-auto">
        <span className="rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300">
          {item.subcategory}
        </span>
        {item.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">
            #{tag}
          </span>
        ))}
        <span className="ml-auto text-xs text-zinc-600">{formatDate(item.dateAdded)}</span>
      </div>

      {/* Source */}
      {item.source && item.source !== "manual" && (
        <p className="text-xs text-zinc-600">
          via {SOURCE_LABELS[item.source] ?? item.source}
        </p>
      )}
    </article>
  );
}
