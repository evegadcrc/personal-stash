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

  const [ratings, comments, myRating] = await Promise.all([
    prisma.itemRating.aggregate({
      where: { itemId: id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.itemComment.findMany({
      where: { itemId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, userEmail: true, userName: true, content: true, createdAt: true },
    }),
    prisma.itemRating.findUnique({
      where: { userEmail_itemId: { userEmail: email, itemId: id } },
      select: { rating: true },
    }),
  ]);

  return NextResponse.json({
    avgRating: ratings._avg.rating ?? null,
    ratingCount: ratings._count.rating,
    myRating: myRating?.rating ?? null,
    comments,
  });
}
