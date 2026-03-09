import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMyShares, getSharedCategoriesForUser } from "@/lib/sharing";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [myShares, sharedWithMe] = await Promise.all([
    getMyShares(email),
    getSharedCategoriesForUser(email),
  ]);

  return NextResponse.json({ myShares, sharedWithMe });
}

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryName, mode, allowedEmails } = await request.json() as {
    categoryName: string;
    mode: "whitelist" | "public";
    allowedEmails?: string[];
  };

  // Ensure user exists
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const share = await prisma.share.upsert({
    where: { ownerEmail_categoryName: { ownerEmail: email, categoryName } },
    update: { mode, allowedEmails: allowedEmails ?? [] },
    create: {
      ownerEmail: email,
      categoryName,
      mode,
      allowedEmails: allowedEmails ?? [],
    },
  });

  return NextResponse.json({ success: true, share });
}
