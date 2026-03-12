import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count") === "true";

  if (countOnly) {
    const count = await prisma.notification.count({ where: { toEmail: email, read: false } });
    return NextResponse.json({ count });
  }

  // Return all recent notifications (read + unread) so panel can show read ones as gray
  const notifications = await prisma.notification.findMany({
    where: { toEmail: email },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

// PATCH — mark as read by itemId (?itemId=xxx) — called when opening an item from a notification
export async function PATCH(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  await prisma.notification.updateMany({
    where: { toEmail: email, itemId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}

// DELETE — clear all notifications (hard delete for "Clear all" action)
export async function DELETE(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.deleteMany({ where: { toEmail: email } });

  return NextResponse.json({ success: true });
}
