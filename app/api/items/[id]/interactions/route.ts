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

  const [upCount, downCount, myVoteRecord, comments] = await Promise.all([
    prisma.itemRating.count({ where: { itemId: id, rating: 1 } }),
    prisma.itemRating.count({ where: { itemId: id, rating: -1 } }),
    prisma.itemRating.findUnique({
      where: { userEmail_itemId: { userEmail: email, itemId: id } },
      select: { rating: true },
    }),
    prisma.itemComment.findMany({
      where: { itemId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, userEmail: true, userName: true, content: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    upCount,
    downCount,
    myVote: (myVoteRecord?.rating ?? null) as 1 | -1 | null,
    comments,
  });
}
