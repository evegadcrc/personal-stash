import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await params;
  const { newName } = await request.json() as { newName: string };

  const cleaned = newName.trim().toLowerCase().replace(/\s+/g, "-");
  if (!cleaned) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (cleaned === name) return NextResponse.json({ success: true, newName: name });

  // Check the new name isn't already taken
  const existing = await prisma.item.findFirst({
    where: { ownerEmail: email, category: cleaned },
  });
  if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });

  await prisma.item.updateMany({
    where: { ownerEmail: email, category: name },
    data: { category: cleaned },
  });

  // Update share record if this category was shared
  await prisma.share.updateMany({
    where: { ownerEmail: email, categoryName: name },
    data: { categoryName: cleaned },
  });

  return NextResponse.json({ success: true, newName: cleaned });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await params;

  // Delete all items in this category owned by the user
  await prisma.item.deleteMany({
    where: { ownerEmail: email, category: name },
  });

  // Remove any share record for this category
  await prisma.share.deleteMany({
    where: { ownerEmail: email, categoryName: name },
  });

  return NextResponse.json({ success: true });
}
