"use client";

import { useState } from "react";
import { CategoryData, Item } from "@/lib/data";

interface EditItemModalProps {
  item: Item;
  categories: CategoryData[];
  onClose: () => void;
  onSave: (updated: Item) => void;
}

interface FormFields {
  title: string;
  url: string;
  summary: string;
  category: string;    // "__new__" means use newCategory
  newCategory: string;
  subcategory: string;
  tagsInput: string;
  source: string;
  content: string;
}

export default function EditItemModal({ item, categories, onClose, onSave }: EditItemModalProps) {
  const existingCategoryNames = categories.map((c) => c.name);
  const catInList = existingCategoryNames.includes(item.category);

  const [fields, setFields] = useState<FormFields>({
    title: item.title,
    url: item.url ?? "",
    summary: item.summary,
    category: catInList ? item.category : "__new__",
    newCategory: catInList ? "" : item.category,
    subcategory: item.subcategory,
    tagsInput: item.tags.join(", "),
    source: item.source ?? "manual",
    content: item.content ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  const canSave =
    fields.title.trim() !== "" &&
    (fields.category !== "__new__" || fields.newCategory.trim() !== "");

  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title.trim(),
          url: fields.url.trim() || null,
          summary: fields.summary.trim(),
          category: effectiveCategoryName,
          subcategory: fields.subcategory.trim(),
          tags: tagChips,
          source: fields.source.trim() || "manual",
          content: fields.content.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      const { item: updated } = (await res.json()) as { item: Item };
      onSave(updated);
      onClose();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function removeTag(index: number) {
    const arr = fields.tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    arr.splice(index, 1);
    setFields((f) => ({ ...f, tagsInput: arr.join(", ") }));
  }

  const inputCls =
    "rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors w-full";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Edit item</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[65vh] pr-1">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Title <span className="text-zinc-600">*</span></label>
            <input
              className={inputCls}
              value={fields.title}
              autoFocus
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
                  — {subcategorySuggestions.slice(0, 5).join(", ")}
                  {subcategorySuggestions.length > 5 ? "…" : ""}
                </span>
              )}
            </label>
            <input
              list="edit-subcategory-list"
              className={inputCls}
              placeholder="e.g. article, tool, to-watch…"
              value={fields.subcategory}
              onChange={(e) => setFields((f) => ({ ...f, subcategory: e.target.value }))}
            />
            {subcategorySuggestions.length > 0 && (
              <datalist id="edit-subcategory-list">
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
                      onClick={() => removeTag(i)}
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

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Notes <span className="text-zinc-600">(optional)</span></label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
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
          {saving ? "Saving…" : "Save changes"}
        </button>

      </div>
    </div>
  );
}
