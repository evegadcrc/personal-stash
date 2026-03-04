import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { Item, getUserDataDir } from "@/lib/data";
import { auth } from "@/auth";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Omit<Item, "id" | "dateAdded">;

  const item: Item = {
    ...body,
    id: crypto.randomUUID(),
    dateAdded: new Date().toISOString(),
  };

  const userDir = getUserDataDir(email);
  fs.mkdirSync(userDir, { recursive: true });

  const filePath = path.join(userDir, `${item.category}.json`);

  let data: { items: Item[] };
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { items: Item[] };
  } else {
    data = { items: [] };
  }

  data.items.unshift(item);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");

  try {
    await execAsync(
      `git add ${filePath} && git commit -m "add: ${item.title}"`,
      { cwd: process.cwd() }
    );
  } catch {
    // git unavailable or not a repo — silently skip
  }

  return NextResponse.json({ success: true, item });
}
