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

  const memberships = await prisma.collectionItem.findMany({
    where: { itemId: id, collection: { ownerEmail: email } },
    select: { collectionId: true },
  });

  return NextResponse.json({ collectionIds: memberships.map((m) => m.collectionId) });
}
