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

  const allowedTypes = [
    // Images
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
    // PDF
    "application/pdf",
    // Word
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    // Excel
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // PowerPoint
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Text / CSV / Markdown
    "text/plain", "text/csv", "text/markdown", "text/x-markdown",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "File type not supported" }, { status: 400 });
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

  const type = file.type.startsWith("image/") ? "image"
    : file.type === "application/pdf" ? "pdf"
    : "document";

  return NextResponse.json({
    url: blob.url,
    type,
    name: file.name,
    size: file.size,
  });
}
