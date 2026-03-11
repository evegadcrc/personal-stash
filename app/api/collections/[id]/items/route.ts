import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// POST — add item to collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { itemId } = await request.json() as { itemId: string };

  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.collectionItem.upsert({
    where: { collectionId_itemId: { collectionId: id, itemId } },
    update: {},
    create: { collectionId: id, itemId },
  });

  const count = await prisma.collectionItem.count({ where: { collectionId: id } });
  return NextResponse.json({ success: true, itemCount: count });
}

// DELETE — remove item from collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.collectionItem.deleteMany({ where: { collectionId: id, itemId } });

  const count = await prisma.collectionItem.count({ where: { collectionId: id } });
  return NextResponse.json({ success: true, itemCount: count });
}
