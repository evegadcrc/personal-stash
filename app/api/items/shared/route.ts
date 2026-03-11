import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { prismaToItem } from "@/lib/data";
import { hasShareAccess } from "@/lib/sharing";
import { auth } from "@/auth";
import { notifyShareMembers } from "@/lib/notifications";

// POST — create a brand-new item and add it to a shared category
export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    shareId: string;
    title: string;
    url?: string | null;
    summary: string;
    category: string;
    subcategory: string;
    tags?: string[];
    source?: string;
    content?: string;
    color?: string | null;
    sharedOnly?: boolean;
  };

  const { hasAccess, share } = await hasShareAccess(body.shareId, email);
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  // Create item — optionally hidden from contributor's personal library
  const item = await prisma.item.create({
    data: {
      ownerEmail: email,
      title: body.title,
      url: body.url ?? null,
      summary: body.summary,
      category: body.category,
      subcategory: body.subcategory,
      tags: body.tags ?? [],
      source: body.source ?? "manual",
      content: body.content ?? null,
      color: body.color ?? null,
      sharedOnly: body.sharedOnly ?? false,
    },
  });

  // Create membership linking item to the shared category
  const membership = await prisma.sharedMembership.create({
    data: { itemId: item.id, shareId: body.shareId, addedBy: email },
  });

  // Notify other share members
  const actor = await prisma.user.findUnique({ where: { email }, select: { name: true } });
  await notifyShareMembers({
    shareId: share.id,
    ownerEmail: share.ownerEmail,
    allowedEmails: share.allowedEmails,
    categoryName: share.categoryName,
    actorEmail: email,
    actorName: actor?.name ?? null,
    itemId: item.id,
    itemTitle: item.title,
  });

  return NextResponse.json({
    success: true,
    item: prismaToItem(item, { addedBy: email, membershipId: membership.id }),
  });
}
