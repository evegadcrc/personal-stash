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

  const normalizedCategory = normalizeCategory(body.category);

  const item = await prisma.item.create({
    data: {
      ownerEmail: email,
      title: body.title,
      url: body.url ?? null,
      summary: body.summary,
      category: normalizedCategory,
      subcategory: body.subcategory,
      tags: body.tags ?? [],
      source: body.source ?? "manual",
      content: body.content ?? null,
      color: body.color ?? null,
      attachments: body.attachments ?? [],
    },
  });

  // Notify share members — search by both the raw and normalized category name
  // because share records may still use the original (pre-normalization) name
  try {
    const share = await prisma.share.findFirst({
      where: {
        ownerEmail: email,
        categoryName: { in: [...new Set([body.category.trim().toLowerCase(), normalizedCategory])] },
      },
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
  } catch (err) {
    console.error("[notifications] failed to notify share members:", err);
    // Non-blocking — item creation already succeeded
  }

  return NextResponse.json({ success: true, item: prismaToItem(item) });
}
