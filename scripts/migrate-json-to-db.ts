/**
 * One-time migration script: reads all data/users/<email>/*.json files
 * and inserts them into the Postgres database via Prisma.
 *
 * Run with:
 *   npx tsx scripts/migrate-json-to-db.ts
 *
 * Prerequisites:
 *   - DATABASE_URL must be set in .env.local
 *   - npx prisma migrate dev (tables must exist)
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface JsonItem {
  id: string;
  title: string;
  url?: string | null;
  summary: string;
  category: string;
  subcategory: string;
  tags?: string[];
  dateAdded?: string;
  content?: string;
  source?: string;
  read?: boolean;
  color?: string;
}

async function main() {
  const dataDir = path.join(process.cwd(), "data", "users");

  if (!fs.existsSync(dataDir)) {
    console.log("No data/users directory found — nothing to migrate.");
    return;
  }

  const userDirs = fs.readdirSync(dataDir).filter((name) => {
    return fs.statSync(path.join(dataDir, name)).isDirectory();
  });

  let totalItems = 0;

  for (const email of userDirs) {
    console.log(`\nMigrating user: ${email}`);

    // Create user record
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const userDir = path.join(dataDir, email);
    const files = fs.readdirSync(userDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(userDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { items } = JSON.parse(raw) as { items: JsonItem[] };

      for (const item of items) {
        // Skip placeholder items
        if (item.id.startsWith("welcome-")) continue;

        try {
          await prisma.item.upsert({
            where: { id: item.id },
            update: {},
            create: {
              id: item.id,
              ownerEmail: email,
              title: item.title,
              url: item.url ?? null,
              summary: item.summary,
              category: item.category,
              subcategory: item.subcategory,
              tags: item.tags ?? [],
              dateAdded: item.dateAdded ? new Date(item.dateAdded) : new Date(),
              content: item.content ?? null,
              source: item.source ?? "manual",
              read: item.read ?? false,
              color: item.color ?? null,
            },
          });
          totalItems++;
        } catch (err) {
          console.warn(`  Skipped item ${item.id}: ${(err as Error).message}`);
        }
      }

      console.log(`  ${file}: migrated items`);
    }
  }

  console.log(`\nMigration complete: ${totalItems} items across ${userDirs.length} users.`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
