"use client";

import { useState, useRef } from "react";
import { EMOJI_SECTIONS } from "@/lib/emoji-bank";

interface IconPickerModalProps {
  categoryName: string;
  currentIcon: string;
  onSave: (icon: string) => Promise<void>;
  onClose: () => void;
}

function isUrl(s: string) {
  return s.startsWith("http") || s.startsWith("/api/");
}

export default function IconPickerModal({ categoryName, currentIcon, onSave, onClose }: IconPickerModalProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"emoji" | "upload">("emoji");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = search.trim().toLowerCase();
  const displaySections = q
    ? EMOJI_SECTIONS.filter((s) => s.label.toLowerCase().includes(q) || s.emojis.length > 0).map((s) => ({
        ...s,
        emojis: s.emojis,
      }))
    : EMOJI_SECTIONS;

  async function handleEmojiClick(emoji: string) {
    setSaving(true);
    await onSave(emoji);
    setSaving(false);
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { url: string };
      await onSave(data.url);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  function handleReset() {
    onSave("").then(() => onClose());
  }

  const inputCls = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-md flex-col gap-0 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
              {isUrl(currentIcon)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={currentIcon} alt="" className="h-8 w-8 rounded-lg object-cover" />
                : currentIcon}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Change icon</p>
              <p className="text-xs text-zinc-500 truncate max-w-[160px]">{categoryName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="h-7 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Reset to default"
            >
              Reset
            </button>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 shrink-0">
          <button
            onClick={() => setTab("emoji")}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === "emoji" ? "text-zinc-100 border-b-2 border-zinc-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Emoji bank
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === "upload" ? "text-zinc-100 border-b-2 border-zinc-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Custom image
          </button>
        </div>

        {tab === "emoji" ? (
          <>
            {/* Search */}
            <div className="px-4 py-3 shrink-0">
              <input
                className={inputCls}
                placeholder="Search sections…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
              {displaySections.map((section) => (
                <div key={section.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">{section.label}</p>
                  <div className="grid grid-cols-8 gap-1">
                    {section.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        disabled={saving}
                        className={`flex h-9 w-full items-center justify-center rounded-lg text-xl transition-colors hover:bg-zinc-700 active:bg-zinc-600 ${currentIcon === emoji ? "bg-zinc-700 ring-1 ring-zinc-400" : ""}`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-4 px-5 py-5 overflow-y-auto">
            {preview ? (
              <div className="flex flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="h-24 w-24 rounded-2xl object-cover border border-zinc-700" />
                <p className="text-xs text-zinc-500">{uploadFile?.name}</p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { setPreview(null); setUploadFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="flex-1 h-9 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={saving}
                    className="flex-1 h-9 rounded-lg bg-zinc-100 text-xs font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {saving ? "Uploading…" : "Use this image"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 py-12 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <span className="text-4xl">🖼️</span>
                <span className="text-sm">Tap to choose an image</span>
                <span className="text-xs text-zinc-600">PNG, JPG, WEBP · max 4 MB</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
