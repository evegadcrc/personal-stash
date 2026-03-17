import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.categoryIcon.findMany({ where: { ownerEmail: email } });
  const icons: Record<string, string> = {};
  for (const row of rows) icons[row.categoryName] = row.icon;
  return NextResponse.json({ icons });
}
