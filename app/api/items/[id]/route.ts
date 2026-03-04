import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { Item, getUserDataDir } from "@/lib/data";
import { auth } from "@/auth";

const execAsync = promisify(exec);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as Partial<Item>;

  const userDir = getUserDataDir(email);
  const files = fs.readdirSync(userDir).filter((f) => f.endsWith(".json"));

  let sourceFile: string | null = null;
  let sourceData: { items: Item[] } | null = null;
  let sourceIndex = -1;

  for (const file of files) {
    const filePath = path.join(userDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { items: Item[] };
    const idx = data.items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      sourceFile = file;
      sourceData = data;
      sourceIndex = idx;
      break;
    }
  }

  if (!sourceFile || !sourceData || sourceIndex === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const original = sourceData.items[sourceIndex];
  const updated: Item = { ...original, ...body, id, dateAdded: original.dateAdded };
  if (!updated.color) delete (updated as unknown as Record<string, unknown>).color;

  const oldCategory = path.basename(sourceFile, ".json");
  const newCategory = updated.category;
  const sourceFilePath = path.join(userDir, sourceFile);

  if (oldCategory !== newCategory) {
    sourceData.items.splice(sourceIndex, 1);
    fs.writeFileSync(sourceFilePath, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

    const targetFilePath = path.join(userDir, `${newCategory}.json`);
    let targetData: { items: Item[] };
    if (fs.existsSync(targetFilePath)) {
      targetData = JSON.parse(fs.readFileSync(targetFilePath, "utf-8")) as { items: Item[] };
    } else {
      targetData = { items: [] };
    }
    targetData.items.unshift(updated);
    fs.writeFileSync(targetFilePath, JSON.stringify(targetData, null, 2) + "\n", "utf-8");

    try {
      await execAsync(
        `git add "${sourceFilePath}" "${targetFilePath}" && git commit -m "edit: ${updated.title}"`,
        { cwd: process.cwd() }
      );
    } catch { /* git unavailable — skip */ }
  } else {
    sourceData.items[sourceIndex] = updated;
    fs.writeFileSync(sourceFilePath, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

    try {
      await execAsync(
        `git add "${sourceFilePath}" && git commit -m "edit: ${updated.title}"`,
        { cwd: process.cwd() }
      );
    } catch { /* git unavailable — skip */ }
  }

  return NextResponse.json({ success: true, item: updated });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { read } = (await request.json()) as { read: boolean };

  const userDir = getUserDataDir(email);
  const files = fs.readdirSync(userDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(userDir, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as { items: Array<Record<string, unknown>> };

    const item = data.items.find((i) => i.id === id);
    if (!item) continue;

    item.read = read;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Item not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const userDir = getUserDataDir(email);
  const files = fs.readdirSync(userDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(userDir, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as { items: Array<{ id: string; title: string }> };

    const index = data.items.findIndex((item) => item.id === id);
    if (index === -1) continue;

    const [removed] = data.items.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");

    try {
      await execAsync(
        `git add ${filePath} && git commit -m "remove: ${removed.title}"`,
        { cwd: process.cwd() }
      );
    } catch {
      // git unavailable or not a repo — silently skip
    }

    return NextResponse.json({ success: true, title: removed.title });
  }

  return NextResponse.json({ error: "Item not found" }, { status: 404 });
}
