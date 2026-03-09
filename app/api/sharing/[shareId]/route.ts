import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assembleSharedCategoryItems } from "@/lib/sharing";
import { auth } from "@/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shareId } = await params;

  const share = await prisma.share.findUnique({
    where: { id: shareId },
    include: { owner: true },
  });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check access
  const hasAccess =
    share.ownerEmail === email ||
    share.mode === "public" ||
    share.allowedEmails.includes(email);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await assembleSharedCategoryItems(share);
  return NextResponse.json({ share, items });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shareId } = await params;
  const { mode, allowedEmails } = await request.json() as {
    mode: "whitelist" | "public";
    allowedEmails?: string[];
  };

  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (share.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.share.update({
    where: { id: shareId },
    data: { mode, allowedEmails: allowedEmails ?? [] },
  });

  return NextResponse.json({ success: true, share: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shareId } = await params;

  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (share.ownerEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.share.delete({ where: { id: shareId } });
  return NextResponse.json({ success: true });
}
