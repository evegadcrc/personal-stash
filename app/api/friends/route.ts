import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFriendsForUser } from "@/lib/sharing";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const friends = await getFriendsForUser(email);
  return NextResponse.json({ friends });
}

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toEmail } = await request.json() as { toEmail: string };
  if (!toEmail || toEmail === email) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Check if target user exists
  const target = await prisma.user.findUnique({ where: { email: toEmail } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check for existing friendship
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromEmail: email, toEmail },
        { fromEmail: toEmail, toEmail: email },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Friendship already exists" }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { fromEmail: email, toEmail },
  });

  return NextResponse.json({ success: true, friendship });
}
