import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { prismaToItem } from "@/lib/data";
import { normalizeCategory } from "@/lib/categories";
import { auth } from "@/auth";
import { notifyShareMembers } from "@/lib/notifications";

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    title: string;
    url?: string | null;
    summary: string;
    category: string;
    subcategory: string;
    tags?: string[];
    source?: string;
    content?: string;
    color?: string | null;
    attachments?: { url: string; type: string; name: string; size: number }[];
  };

  // Ensure user exists
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const item = await prisma.item.create({
    data: {
      ownerEmail: email,
      title: body.title,
      url: body.url ?? null,
      summary: body.summary,
      category: normalizeCategory(body.category),
      subcategory: body.subcategory,
      tags: body.tags ?? [],
      source: body.source ?? "manual",
      content: body.content ?? null,
      color: body.color ?? null,
      attachments: body.attachments ?? [],
    },
  });

  // If this category is shared, notify members
  const share = await prisma.share.findUnique({
    where: { ownerEmail_categoryName: { ownerEmail: email, categoryName: item.category } },
  });
  if (share && (share.allowedEmails.length > 0 || share.mode === "public")) {
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
  }

  return NextResponse.json({ success: true, item: prismaToItem(item) });
}
