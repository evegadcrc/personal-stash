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
  sharedOnly?: boolean;
  // Virtual fields — set when fetched via SharedMembership
  addedBy?: string;
  membershipId?: string;
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
  sharedOnly: boolean;
};

export function prismaToItem(p: PrismaItem, virtual?: { addedBy?: string; membershipId?: string }): Item {
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
    sharedOnly: p.sharedOnly,
    addedBy: virtual?.addedBy,
    membershipId: virtual?.membershipId,
  };
}

async function seedWelcomeItems(email: string): Promise<void> {
  await prisma.item.createMany({
    data: [
      {
        ownerEmail: email,
        title: "Welcome to Personal Stash",
        url: null,
        summary:
          "Personal Stash is your digital memory. Save links, notes, ideas, movies, places — anything worth keeping, always at your fingertips.",
        category: "bookmarks",
        subcategory: "reference",
        tags: ["welcome", "getting-started"],
        source: "stash",
        read: false,
      },
      {
        ownerEmail: email,
        title: "How to add items",
        url: null,
        summary:
          "Click the + button in the top right corner to add a new item. Paste a URL or describe something and Personal Stash will analyze it automatically using AI.",
        category: "bookmarks",
        subcategory: "reference",
        tags: ["welcome", "guide"],
        source: "stash",
        read: false,
      },
    ],
  });
}

export async function getAllCategories(email: string): Promise<CategoryData[]> {
  if (!email) return [];

  const items = await prisma.item.findMany({
    where: { ownerEmail: email, sharedOnly: false },
    orderBy: { dateAdded: "desc" },
  });

  if (items.length === 0) {
    await seedWelcomeItems(email);
    return getAllCategories(email);
  }

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

export async function getCategoryItems(email: string, category: string): Promise<Item[]> {
  const items = await prisma.item.findMany({
    where: { ownerEmail: email, category, sharedOnly: false },
    orderBy: { dateAdded: "desc" },
  });
  return items.map((i) => prismaToItem(i));
}
