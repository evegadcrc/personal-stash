import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await params;
  const categoryName = decodeURIComponent(name);
  const { icon } = await request.json() as { icon: string };
  if (!icon) return NextResponse.json({ error: "Icon required" }, { status: 400 });

  await prisma.categoryIcon.upsert({
    where: { ownerEmail_categoryName: { ownerEmail: email, categoryName } },
    create: { ownerEmail: email, categoryName, icon },
    update: { icon },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await params;
  const categoryName = decodeURIComponent(name);
  await prisma.categoryIcon.deleteMany({ where: { ownerEmail: email, categoryName } });
  return NextResponse.json({ ok: true });
}
