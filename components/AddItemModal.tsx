"use client";

import { useState, useRef, useCallback } from "react";
import { CategoryData, Item } from "@/lib/data";

interface AddItemModalProps {
  categories: CategoryData[];
  onClose: () => void;
  onSave: (item: Item) => void;
  shareId?: string;
  shareCategory?: string;
}

type Mode = "auto" | "manual";
type InputTab = "url" | "text" | "image";

type ItemColor = "amber" | "blue" | "rose";

interface FormFields {
  title: string;
  url: string;
  summary: string;
  category: string;    // "__new__" means use newCategory
  newCategory: string;
  subcategory: string;
  tagsInput: string;   // comma-separated raw string
  source: string;
  content: string;
  color?: ItemColor;
}

const BLANK_FIELDS: FormFields = {
  title: "",
  url: "",
  summary: "",
  category: "bookmarks",
  newCategory: "",
  subcategory: "",
  tagsInput: "",
  source: "manual",
  content: "",
  color: undefined,
};

export default function AddItemModal({ categories, onClose, onSave, shareId, shareCategory }: AddItemModalProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [inputTab, setInputTab] = useState<InputTab>("url");

  // Auto step inputs
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState("");
  const [imageName, setImageName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [fields, setFields] = useState<FormFields>(BLANK_FIELDS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Derived values
  const existingCategoryNames = categories.map((c) => c.name);
  const effectiveCategoryName =
    fields.category === "__new__"
      ? fields.newCategory.trim().toLowerCase().replace(/\s+/g, "-")
      : fields.category;
  const selectedCatData = categories.find((c) => c.name === effectiveCategoryName);
  const subcategorySuggestions = selectedCatData
    ? [...new Set(selectedCatData.items.map((i) => i.subcategory))].sort()
    : [];
  const tagChips = fields.tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const handleFileChange = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const [header, data] = result.split(",");
      const mediaType = header.replace("data:", "").replace(";base64", "");
      setImageBase64(data);
      setImageMediaType(mediaType);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }, []);

  async function handleAnalyze() {
    setAnalyzeError("");
    setAnalyzing(true);
    try {
      const body: Record<string, string> = {};
      if (inputTab === "url") body.url = urlInput.trim();
      else if (inputTab === "text") body.text = textInput.trim();
      else if (inputTab === "image" && imageBase64) {
        body.imageBase64 = imageBase64;
        body.mediaType = imageMediaType;
      }

      const res = await fetch("/api/items/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Analysis failed");
      }

      const data = (await res.json()) as {
        title?: string; summary?: string; category?: string;
        subcategory?: string; tags?: string[]; url?: string; source?: string;
      };

      const aiCat = data.category ?? "bookmarks";
      const catExists = existingCategoryNames.includes(aiCat);

      setFields({
        title: data.title ?? "",
        url: data.url ?? (inputTab === "url" ? urlInput.trim() : ""),
        summary: data.summary ?? "",
        category: catExists ? aiCat : "__new__",
        newCategory: catExists ? "" : aiCat,
        subcategory: data.subcategory ?? "",
        tagsInput: (data.tags ?? []).join(", "),
        source: data.source ?? "web",
        content: "",
        color: undefined,
      });
      setShowForm(true);
    } catch (e) {
      setAnalyzeError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleChooseManual() {
    const defaultCat = existingCategoryNames[0] ?? "bookmarks";
    setFields({ ...BLANK_FIELDS, category: defaultCat, source: "manual" });
    setMode("manual");
    setShowForm(true);
  }

  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      const endpoint = shareId ? "/api/items/shared" : "/api/items";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(shareId ? { shareId } : {}),
          title: fields.title.trim(),
          url: fields.url.trim() || null,
          summary: fields.summary.trim(),
          category: shareCategory ?? effectiveCategoryName,
          subcategory: fields.subcategory.trim(),
          tags: tagChips,
          source: fields.source.trim() || "manual",
          content: fields.content.trim() || undefined,
          color: fields.color ?? null,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      const { item: saved } = (await res.json()) as { item: Item };
      onSave(saved);
      onClose();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (showForm && mode === "auto") {
      setShowForm(false);
    } else {
      setMode(null);
      setShowForm(false);
    }
  }

  const inputCls =
    "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors w-full";

  const modalTitle =
    mode === null ? "Add item"
    : mode === "auto" && !showForm ? "Auto — AI analysis"
    : mode === "auto" && showForm ? "Review & save"
    : "Manual entry";

  const canAnalyze =
    (inputTab === "url" && urlInput.trim() !== "") ||
    (inputTab === "text" && textInput.trim() !== "") ||
    (inputTab === "image" && imageBase64 !== null);

  const canSave =
    fields.title.trim() !== "" &&
    (fields.category !== "__new__" || fields.newCategory.trim() !== "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode !== null && (
              <button
                onClick={handleBack}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
                aria-label="Back"
              >
                ←
              </button>
            )}
            <h2 className="text-base font-semibold text-zinc-100">{modalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── MODE PICKER ─────────────────────────────────────────── */}
        {mode === null && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode("auto")}
              className="flex items-start gap-4 rounded-xl border border-zinc-700 p-4 text-left hover:border-zinc-500 hover:bg-zinc-800/40 transition-all group"
            >
              <span className="shrink-0 mt-0.5 text-lg text-zinc-400 group-hover:text-zinc-200 transition-colors">✦</span>
              <div>
                <p className="text-sm font-medium text-zinc-100">Auto — AI analysis</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Paste a URL, raw text, or drop an image. Claude will infer title, summary, category, and tags.
                </p>
              </div>
            </button>
            <button
              onClick={handleChooseManual}
              className="flex items-start gap-4 rounded-xl border border-zinc-700 p-4 text-left hover:border-zinc-500 hover:bg-zinc-800/40 transition-all group"
            >
              <span className="shrink-0 mt-0.5 text-lg text-zinc-400 group-hover:text-zinc-200 transition-colors">✎</span>
              <div>
                <p className="text-sm font-medium text-zinc-100">Manual entry</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Fill in all fields yourself. Pick an existing category or create a new one.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ── AUTO: INPUT STEP ────────────────────────────────────── */}
        {mode === "auto" && !showForm && (
          <>
            {/* Input type tabs */}
            <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
              {(["url", "text", "image"] as InputTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setInputTab(t)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
                    inputTab === t
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {inputTab === "url" && (
              <input
                type="url"
                placeholder="https://…"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAnalyze && handleAnalyze()}
                className={inputCls}
                autoFocus
              />
            )}

            {inputTab === "text" && (
              <textarea
                placeholder="Paste any text, notes, or description…"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={5}
                className={`${inputCls} resize-none`}
                autoFocus
              />
            )}

            {inputTab === "image" && (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileChange(file);
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 p-8 cursor-pointer hover:border-zinc-500 transition-colors"
              >
                {imageName ? (
                  <p className="text-sm text-zinc-300">{imageName}</p>
                ) : (
                  <>
                    <p className="text-sm text-zinc-400">Drop image here or click to upload</p>
                    <p className="text-xs text-zinc-600">PNG, JPG, GIF, WEBP</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />
              </div>
            )}

            {analyzeError && <p className="text-xs text-red-400">{analyzeError}</p>}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !canAnalyze}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {analyzing ? "Analyzing…" : "Analyze →"}
            </button>
          </>
        )}

        {/* ── FORM (auto review OR manual) ───────────────────────── */}
        {showForm && (
          <>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[62vh] pr-1">

              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Title <span className="text-zinc-600">*</span></label>
                <input
                  className={inputCls}
                  value={fields.title}
                  autoFocus={mode === "manual"}
                  onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* URL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">URL</label>
                <input
                  className={inputCls}
                  placeholder="https://…"
                  value={fields.url}
                  onChange={(e) => setFields((f) => ({ ...f, url: e.target.value }))}
                />
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Summary</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={fields.summary}
                  onChange={(e) => setFields((f) => ({ ...f, summary: e.target.value }))}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Category <span className="text-zinc-600">*</span></label>
                <select
                  className={inputCls}
                  value={fields.category}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, category: e.target.value, subcategory: "" }))
                  }
                >
                  {existingCategoryNames.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">+ New category…</option>
                </select>
                {fields.category === "__new__" && (
                  <input
                    className={`${inputCls} mt-1`}
                    placeholder="new-category-name (lowercase)"
                    value={fields.newCategory}
                    autoFocus
                    onChange={(e) =>
                      setFields((f) => ({
                        ...f,
                        newCategory: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-"),
                      }))
                    }
                  />
                )}
              </div>

              {/* Subcategory */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">
                  Subcategory
                  {subcategorySuggestions.length > 0 && (
                    <span className="ml-1 text-zinc-600">
                      — existing: {subcategorySuggestions.slice(0, 4).join(", ")}
                      {subcategorySuggestions.length > 4 ? "…" : ""}
                    </span>
                  )}
                </label>
                <input
                  list="subcategory-list"
                  className={inputCls}
                  placeholder="e.g. article, tool, to-watch…"
                  value={fields.subcategory}
                  onChange={(e) => setFields((f) => ({ ...f, subcategory: e.target.value }))}
                />
                {subcategorySuggestions.length > 0 && (
                  <datalist id="subcategory-list">
                    {subcategorySuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Tags</label>
                <input
                  className={inputCls}
                  placeholder="react, typescript, open-source"
                  value={fields.tagsInput}
                  onChange={(e) => setFields((f) => ({ ...f, tagsInput: e.target.value }))}
                />
                {tagChips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tagChips.map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => {
                            const arr = fields.tagsInput
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean);
                            arr.splice(i, 1);
                            setFields((f) => ({ ...f, tagsInput: arr.join(", ") }));
                          }}
                          className="text-zinc-500 hover:text-zinc-200 leading-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Source */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Source</label>
                <input
                  className={inputCls}
                  placeholder="manual, web, youtube, book…"
                  value={fields.source}
                  onChange={(e) => setFields((f) => ({ ...f, source: e.target.value }))}
                />
              </div>

              {/* Color */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400">Color <span className="text-zinc-600">(priority flag)</span></label>
                <div className="flex gap-3">
                  {([
                    { value: undefined,              dot: "bg-zinc-600",   title: "None" },
                    { value: "rose"  as ItemColor,   dot: "bg-rose-500",   title: "Rose" },
                    { value: "amber" as ItemColor,   dot: "bg-amber-500",  title: "Amber" },
                    { value: "blue"  as ItemColor,   dot: "bg-blue-500",   title: "Blue" },
                  ] as { value: ItemColor | undefined; dot: string; title: string }[]).map(({ value, dot, title }) => (
                    <button
                      key={title}
                      type="button"
                      title={title}
                      onClick={() => setFields((f) => ({ ...f, color: value }))}
                      className={`h-7 w-7 rounded-full transition-all ${dot} ${
                        fields.color === value
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                          : "opacity-50 hover:opacity-90"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Notes / Content */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Notes <span className="text-zinc-600">(optional)</span></label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Extended notes, quotes, or extra context…"
                  value={fields.content}
                  onChange={(e) => setFields((f) => ({ ...f, content: e.target.value }))}
                />
              </div>

            </div>

            {saveError && <p className="text-xs text-red-400">{saveError}</p>}

            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
