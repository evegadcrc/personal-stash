import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only images and PDFs are allowed" }, { status: 400 });
  }

  const maxSize = 20 * 1024 * 1024; // 20 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const safeName = `${session.user.email}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(safeName, file, {
    access: "public",
    contentType: file.type,
  });

  const type = file.type === "application/pdf" ? "pdf" : "image";

  return NextResponse.json({
    url: blob.url,
    type,
    name: file.name,
    size: file.size,
  });
}
