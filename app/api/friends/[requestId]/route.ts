import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;
  const { action } = await request.json() as { action: "accept" | "decline" };

  const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the receiver can accept/decline
  if (friendship.toEmail !== email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.friendship.update({
    where: { id: requestId },
    data: {
      status: action === "accept" ? "accepted" : "declined",
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, friendship: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;

  const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only participants can remove friendship
  if (friendship.fromEmail !== email && friendship.toEmail !== email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id: requestId } });
  return NextResponse.json({ success: true });
}
