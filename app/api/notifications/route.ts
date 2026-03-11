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

  const notifications = await prisma.notification.findMany({
    where: { toEmail: email, read: false },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ notifications });
}

// DELETE — mark as read: all (no params) or by itemId (?itemId=xxx)
export async function DELETE(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  await prisma.notification.updateMany({
    where: { toEmail: email, read: false, ...(itemId ? { itemId } : {}) },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
