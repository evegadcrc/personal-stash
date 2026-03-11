import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collections = await prisma.collection.findMany({
    where: { ownerEmail: email },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ collections });
}

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, color } = await request.json() as {
    name: string;
    description?: string;
    color?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const collection = await prisma.collection.create({
    data: { ownerEmail: email, name: name.trim(), description, color },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ collection });
}
