import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const comments = await prisma.itemComment.findMany({
    where: { itemId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, userEmail: true, userName: true, content: true, createdAt: true },
  });

  return NextResponse.json({ comments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await request.json() as { content: string };

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { name: true } });

  const comment = await prisma.itemComment.create({
    data: {
      itemId: id,
      userEmail: email,
      userName: user?.name ?? null,
      content: content.trim(),
    },
    select: { id: true, userEmail: true, userName: true, content: true, createdAt: true },
  });

  return NextResponse.json({ comment });
}
