import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { prismaToItem } from "@/lib/data";
import { auth } from "@/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    title?: string;
    url?: string | null;
    summary?: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    source?: string;
    content?: string | null;
    color?: string | null;
    attachments?: { url: string; type: string; name: string; size: number }[];
  };

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // Only the owner (or contributor) can edit
  const canEdit = existing.ownerEmail === email;
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.item.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      url: "url" in body ? (body.url ?? null) : existing.url,
      summary: body.summary ?? existing.summary,
      category: body.category ?? existing.category,
      subcategory: body.subcategory ?? existing.subcategory,
      tags: body.tags ?? existing.tags,
      source: body.source ?? existing.source,
      content: "content" in body ? (body.content ?? null) : existing.content,
      color: "color" in body ? (body.color ?? null) : existing.color,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attachments: "attachments" in body ? (body.attachments ?? []) : (existing.attachments as any),
    },
  });

  return NextResponse.json({ success: true, item: prismaToItem(updated) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { read } = await request.json() as { read: boolean };

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const canEdit = existing.ownerEmail === email;
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.item.update({ where: { id }, data: { read } });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const canDelete = existing.ownerEmail === email;
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ success: true, title: existing.title });
}
