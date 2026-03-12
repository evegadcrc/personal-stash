"use client";

import { useRef, useState } from "react";
import { Attachment } from "@/lib/data";

interface Props {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

export default function AttachmentsField({ attachments, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) {
          let msg = "Upload failed";
          try {
            const err = (await res.json()) as { error?: string };
            msg = err.error ?? msg;
          } catch {
            // Non-JSON response (e.g. "Request Entity Too Large" from Vercel)
            if (res.status === 413) msg = "File too large (max ~4 MB per file)";
          }
          throw new Error(msg);
        }
        const att = (await res.json()) as Attachment;
        uploaded.push(att);
      }
      onChange([...attachments, ...uploaded]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(index: number) {
    const next = [...attachments];
    next.splice(index, 1);
    onChange(next);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-zinc-400">
        Attachments <span className="text-zinc-600">(any file, max 4 MB)</span>
      </label>

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="group relative flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-xs text-zinc-300"
            >
              {att.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.url}
                  alt={att.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-700">
                  <DocIcon name={att.name} type={att.type} />
                </div>
              )}
              <div className="flex flex-col">
                <span className="max-w-[120px] truncate text-zinc-200">{att.name}</span>
                <span className="text-zinc-500">{formatSize(att.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                title="Remove"
              >
                ✕
              </button>
              {att.type === "image" && (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 rounded-lg"
                  title="Open image"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UploadIcon />
        {uploading ? "Uploading…" : "Upload file"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DocIcon({ name, type }: { name: string; type: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const color =
    type === "pdf" ? "text-red-400"
    : ext === "doc" || ext === "docx" ? "text-blue-400"
    : ext === "xls" || ext === "xlsx" || ext === "csv" ? "text-emerald-400"
    : ext === "ppt" || ext === "pptx" ? "text-orange-400"
    : "text-zinc-400";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={color}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}
