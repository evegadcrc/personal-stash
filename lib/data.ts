import { prisma } from "./db";

export interface Item {
  id: string;
  ownerEmail?: string;
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
  sortOrder?: number;
  addedBy?: string;
  shareId?: string;
}

export interface CategoryData {
  name: string;
  items: Item[];
}

type PrismaItem = {
  id: string;
  ownerEmail: string;
  title: string;
  url: string | null;
  summary: string;
  category: string;
  subcategory: string;
  tags: string[];
  dateAdded: Date;
  content: string | null;
  source: string;
  read: boolean;
  color: string | null;
  sortOrder: number | null;
  addedBy: string | null;
  shareId: string | null;
};

export function prismaToItem(p: PrismaItem): Item {
  return {
    id: p.id,
    ownerEmail: p.ownerEmail,
    title: p.title,
    url: p.url,
    summary: p.summary,
    category: p.category,
    subcategory: p.subcategory,
    tags: p.tags,
    dateAdded: p.dateAdded.toISOString(),
    content: p.content ?? undefined,
    source: p.source,
    read: p.read,
    color: (p.color as "amber" | "blue" | "rose") ?? undefined,
    sortOrder: p.sortOrder ?? undefined,
    addedBy: p.addedBy ?? undefined,
    shareId: p.shareId ?? undefined,
  };
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

export async function getAllCategories(email: string): Promise<CategoryData[]> {
  if (!email) return PLACEHOLDER_CATEGORIES;

  const items = await prisma.item.findMany({
    where: { ownerEmail: email, shareId: null },
    orderBy: { dateAdded: "desc" },
  });

  if (items.length === 0) return PLACEHOLDER_CATEGORIES;

  const categoryMap = new Map<string, Item[]>();
  for (const item of items) {
    const arr = categoryMap.get(item.category) ?? [];
    arr.push(prismaToItem(item));
    categoryMap.set(item.category, arr);
  }

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, items]) => ({ name, items }));
}

export async function getAllItems(email: string): Promise<Item[]> {
  const categories = await getAllCategories(email);
  return categories.flatMap((c) => c.items);
}

export async function getCategoryItems(
  email: string,
  category: string
): Promise<Item[]> {
  const items = await prisma.item.findMany({
    where: { ownerEmail: email, category, shareId: null },
    orderBy: { dateAdded: "desc" },
  });
  return items.map(prismaToItem);
}
