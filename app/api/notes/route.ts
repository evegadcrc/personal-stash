import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  if (!category) return NextResponse.json({ content: "" });

  const note = await prisma.categoryNote.findUnique({
    where: { ownerEmail_categoryName: { ownerEmail: email, categoryName: category } },
    select: { content: true, updatedAt: true },
  });

  return NextResponse.json({ content: note?.content ?? "", updatedAt: note?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, content } = await request.json() as { category: string; content: string };
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

  const note = await prisma.categoryNote.upsert({
    where: { ownerEmail_categoryName: { ownerEmail: email, categoryName: category } },
    update: { content },
    create: { ownerEmail: email, categoryName: category, content },
  });

  return NextResponse.json({ success: true, updatedAt: note.updatedAt });
}
