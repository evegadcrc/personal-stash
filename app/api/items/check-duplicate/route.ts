import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();
  if (!url) return NextResponse.json({ exists: false });

  const existing = await prisma.item.findFirst({
    where: { ownerEmail: email, url },
    select: { id: true, title: true, category: true },
  });

  return NextResponse.json({ exists: !!existing, item: existing ?? null });
}
