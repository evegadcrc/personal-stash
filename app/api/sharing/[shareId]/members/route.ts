import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasShareAccess } from "@/lib/sharing";
import { auth } from "@/auth";
import { notifyShareMembers } from "@/lib/notifications";

// POST — link an existing item to a shared category
export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shareId } = await params;
  const { itemId } = await request.json() as { itemId: string };

  // Verify the item belongs to the current user
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify share access
  const { hasAccess, share } = await hasShareAccess(shareId, email);
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Create membership (upsert to avoid duplicates)
  const membership = await prisma.sharedMembership.upsert({
    where: { itemId_shareId: { itemId, shareId } },
    update: {},
    create: { itemId, shareId, addedBy: email },
  });

  // Notify other share members (non-blocking)
  try {
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
  } catch (err) {
    console.error("[notifications] failed to notify share members:", err);
  }

  return NextResponse.json({ success: true, membership });
}
