import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// DELETE — remove an item from a shared category (membership only, item is NOT deleted)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ shareId: string; membershipId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shareId, membershipId } = await params;

  const membership = await prisma.sharedMembership.findUnique({
    where: { id: membershipId },
    include: { share: true, item: true },
  });

  if (!membership || membership.shareId !== shareId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Allowed: item owner OR share owner
  const canRemove =
    membership.item.ownerEmail === email ||
    membership.share.ownerEmail === email;

  if (!canRemove) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.sharedMembership.delete({ where: { id: membershipId } });
  return NextResponse.json({ success: true });
}
