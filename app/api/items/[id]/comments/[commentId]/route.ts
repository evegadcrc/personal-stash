import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const { content } = await request.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const comment = await prisma.itemComment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.userEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.itemComment.update({
    where: { id: commentId },
    data: { content: content.trim() },
    select: { id: true, userEmail: true, userName: true, content: true, createdAt: true },
  });

  return NextResponse.json({ comment: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;

  const comment = await prisma.itemComment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.userEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.itemComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
