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
  read?: boolean;
  color?: "amber" | "blue" | "rose";
}

export interface CategoryData {
  name: string;
  items: Item[];
}

const DATA_DIR = path.join(process.cwd(), "data");

export function getUserDataDir(email: string): string {
  return path.join(DATA_DIR, "users", email);
}

const PLACEHOLDER_CATEGORIES: CategoryData[] = [
  {
    name: "bookmarks",
    items: [
      {
        id: "welcome-1",
        title: "Welcome to Stash",
        url: null,
        summary:
          "Stash is your personal knowledge base. Save links, notes, ideas, movies, places — anything you want to keep and find later.",
        category: "bookmarks",
        subcategory: "reference",
        tags: ["welcome", "getting-started"],
        dateAdded: new Date().toISOString(),
        source: "stash",
        read: false,
      },
      {
        id: "welcome-2",
        title: "How to add items",
        url: null,
        summary:
          "Click the + button in the top right corner to add a new item. Paste a URL or describe something and Stash will analyze it automatically using AI.",
        category: "bookmarks",
        subcategory: "reference",
        tags: ["welcome", "guide"],
        dateAdded: new Date().toISOString(),
        source: "stash",
        read: false,
      },
    ],
  },
];

export function getAllCategories(email: string): CategoryData[] {
  const userDir = getUserDataDir(email);

  if (!fs.existsSync(userDir)) {
    return PLACEHOLDER_CATEGORIES;
  }

  const files = fs
    .readdirSync(userDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    return PLACEHOLDER_CATEGORIES;
  }

  return files.map((file) => {
    const name = path.basename(file, ".json");
    const raw = fs.readFileSync(path.join(userDir, file), "utf-8");
    const { items } = JSON.parse(raw) as { items: Item[] };
    return { name, items };
  });
}

export function getAllItems(email: string): Item[] {
  return getAllCategories(email).flatMap((c) => c.items);
}

export function getCategoryItems(email: string, category: string): Item[] {
  const filePath = path.join(getUserDataDir(email), `${category}.json`);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const { items } = JSON.parse(raw) as { items: Item[] };
  return items;
}
