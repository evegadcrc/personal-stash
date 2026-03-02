"use client";

import { useState, useMemo } from "react";
import { CategoryData, Item } from "@/lib/data";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import SubcategoryFilter from "./SubcategoryFilter";
import ItemCard from "./ItemCard";

interface KnowledgeBaseProps {
  categories: CategoryData[];
}

export default function KnowledgeBase({ categories }: KnowledgeBaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Reset subcategory when category changes
  function handleCategoryChange(cat: string | null) {
    setSelectedCategory(cat);
    setSelectedSubcategory(null);
    setSearchQuery("");
  }

  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = categories.find((c) => c.name === selectedCategory);
    if (!cat) return [];
    return [...new Set(cat.items.map((i) => i.subcategory))].sort();
  }, [categories, selectedCategory]);

  const filteredItems = useMemo(() => {
    let items: Item[] = selectedCategory
      ? (categories.find((c) => c.name === selectedCategory)?.items ?? [])
      : categories.flatMap((c) => c.items);

    if (selectedSubcategory) {
      items = items.filter((i) => i.subcategory === selectedSubcategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          i.subcategory.toLowerCase().includes(q)
      );
    }

    return items.sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }, [categories, selectedCategory, selectedSubcategory, searchQuery]);

  const categoryLabel = selectedCategory
    ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
    : "All";

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <nav className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-800 px-3 py-6">
        <div className="px-3">
          <h1 className="text-base font-bold text-zinc-100">Info</h1>
          <p className="text-xs text-zinc-500">Personal knowledge base</p>
        </div>
        <Sidebar
          categories={categories}
          selected={selectedCategory}
          onSelect={handleCategoryChange}
        />
      </nav>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-100">{categoryLabel}</h2>
            <div className="w-80">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>

          {subcategories.length > 0 && (
            <div className="mt-3">
              <SubcategoryFilter
                subcategories={subcategories}
                selected={selectedSubcategory}
                onSelect={setSelectedSubcategory}
              />
            </div>
          )}
        </header>

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {filteredItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-zinc-400">No items found</p>
              {searchQuery && (
                <p className="text-sm text-zinc-600">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-zinc-600">
                {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
