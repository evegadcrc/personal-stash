/**
 * Migration: normalize Spanish/accented category names to English slugs.
 * Run once: npx tsx scripts/fix-category-names.ts
 */
import { PrismaClient } from "@prisma/client";
import { normalizeCategory } from "../lib/categories";

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({ select: { id: true, category: true } });
  const itemUpdates: Record<string, string[]> = {}; // normalized → [ids]

  for (const item of items) {
    const normalized = normalizeCategory(item.category);
    if (normalized !== item.category) {
      if (!itemUpdates[normalized]) itemUpdates[normalized] = [];
      itemUpdates[normalized].push(item.id);
      console.log(`  item ${item.id}: "${item.category}" → "${normalized}"`);
    }
  }

  if (Object.keys(itemUpdates).length === 0) {
    console.log("✅ All item categories are already normalized — nothing to do.");
  } else {
    for (const [normalized, ids] of Object.entries(itemUpdates)) {
      await prisma.item.updateMany({ where: { id: { in: ids } }, data: { category: normalized } });
    }
    console.log(`✅ Updated ${Object.values(itemUpdates).flat().length} items.`);
  }

  // Also fix Share records
  const shares = await prisma.share.findMany({ select: { id: true, categoryName: true } });
  let shareCount = 0;
  for (const share of shares) {
    const normalized = normalizeCategory(share.categoryName);
    if (normalized !== share.categoryName) {
      await prisma.share.update({ where: { id: share.id }, data: { categoryName: normalized } });
      console.log(`  share ${share.id}: "${share.categoryName}" → "${normalized}"`);
      shareCount++;
    }
  }

  // Also fix CategoryNotes
  const notes = await prisma.categoryNote.findMany({ select: { ownerEmail: true, categoryName: true } });
  let noteCount = 0;
  for (const note of notes) {
    const normalized = normalizeCategory(note.categoryName);
    if (normalized !== note.categoryName) {
      // upsert into normalized name, delete old
      const existing = await prisma.categoryNote.findUnique({
        where: { ownerEmail_categoryName: { ownerEmail: note.ownerEmail, categoryName: normalized } },
      });
      if (!existing) {
        await prisma.categoryNote.create({
          data: { ownerEmail: note.ownerEmail, categoryName: normalized, content: "" },
        });
      }
      await prisma.categoryNote.delete({
        where: { ownerEmail_categoryName: { ownerEmail: note.ownerEmail, categoryName: note.categoryName } },
      });
      console.log(`  note "${note.categoryName}" → "${normalized}"`);
      noteCount++;
    }
  }

  console.log(`✅ ${shareCount} share(s) and ${noteCount} note(s) fixed.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
