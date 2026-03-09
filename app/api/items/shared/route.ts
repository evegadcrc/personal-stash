import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { prismaToItem } from "@/lib/data";
import { auth } from "@/auth";

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
  };

  if (!body.shareId) {
    return NextResponse.json({ error: "shareId is required" }, { status: 400 });
  }

  // Verify share exists and user has access
  const share = await prisma.share.findUnique({ where: { id: body.shareId } });
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });

  const hasAccess =
    share.mode === "public" || share.allowedEmails.includes(email);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Ensure contributor user exists
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const item = await prisma.item.create({
    data: {
      ownerEmail: email,
      addedBy: email,
      shareId: body.shareId,
      title: body.title,
      url: body.url ?? null,
      summary: body.summary,
      category: body.category,
      subcategory: body.subcategory,
      tags: body.tags ?? [],
      source: body.source ?? "manual",
      content: body.content ?? null,
      color: body.color ?? null,
    },
  });

  return NextResponse.json({ success: true, item: prismaToItem(item) });
}
