import fs from "fs";
import path from "path";

export interface Item {
  id: string;
  title: string;
  url: string | null;
  summary: string;
  category: string;
  subcategory: string;
  tags: string[];
  dateAdded: string;
  content?: string;
  source: string;
}

export interface CategoryData {
  name: string;
  items: Item[];
}

const DATA_DIR = path.join(process.cwd(), "data");

export function getAllCategories(): CategoryData[] {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((file) => {
    const name = path.basename(file, ".json");
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    const { items } = JSON.parse(raw) as { items: Item[] };
    return { name, items };
  });
}

export function getAllItems(): Item[] {
  return getAllCategories().flatMap((c) => c.items);
}

export function getCategoryItems(category: string): Item[] {
  const filePath = path.join(DATA_DIR, `${category}.json`);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const { items } = JSON.parse(raw) as { items: Item[] };
  return items;
}

export function getSubcategories(category: string): string[] {
  const items = getCategoryItems(category);
  return [...new Set(items.map((i) => i.subcategory))].sort();
}
