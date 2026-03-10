import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { prismaToItem } from "@/lib/data";
import { normalizeCategory } from "@/lib/categories";
import { auth } from "@/auth";

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

  return NextResponse.json({ success: true, item: prismaToItem(item) });
}
