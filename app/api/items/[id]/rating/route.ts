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
  const { rating } = await request.json() as { rating: number | null };

  if (rating === null) {
    await prisma.itemRating.deleteMany({
      where: { userEmail: email, itemId: id },
    });
  } else {
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
    }
    await prisma.itemRating.upsert({
      where: { userEmail_itemId: { userEmail: email, itemId: id } },
      update: { rating },
      create: { userEmail: email, itemId: id, rating },
    });
  }

  const agg = await prisma.itemRating.aggregate({
    where: { itemId: id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return NextResponse.json({
    myRating: rating,
    avgRating: agg._avg.rating ?? null,
    ratingCount: agg._count.rating,
  });
}
