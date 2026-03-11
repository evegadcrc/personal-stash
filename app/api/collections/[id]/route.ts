import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { prismaToItem } from "@/lib/data";
import { auth } from "@/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      items: {
        include: { item: true },
        orderBy: { addedAt: "desc" },
      },
      _count: { select: { items: true } },
    },
  });

  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = collection.items.map((ci) => prismaToItem(ci.item));
  return NextResponse.json({ collection, items });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, description, color } = await request.json() as {
    name?: string;
    description?: string;
    color?: string;
  };

  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.collection.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(color !== undefined ? { color } : {}),
    },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ collection: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collection.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
