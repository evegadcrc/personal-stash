import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { vote } = await request.json() as { vote: 1 | -1 | null };

  if (vote === null) {
    await prisma.itemRating.deleteMany({ where: { userEmail: email, itemId: id } });
  } else {
    if (vote !== 1 && vote !== -1) {
      return NextResponse.json({ error: "Vote must be 1 or -1" }, { status: 400 });
    }
    await prisma.itemRating.upsert({
      where: { userEmail_itemId: { userEmail: email, itemId: id } },
      update: { rating: vote },
      create: { userEmail: email, itemId: id, rating: vote },
    });
  }

  const [upCount, downCount] = await Promise.all([
    prisma.itemRating.count({ where: { itemId: id, rating: 1 } }),
    prisma.itemRating.count({ where: { itemId: id, rating: -1 } }),
  ]);

  return NextResponse.json({ myVote: vote, upCount, downCount });
}
