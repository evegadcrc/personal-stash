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

  const maxSize = 4 * 1024 * 1024; // 4 MB — Vercel serverless body limit
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 4 MB)" }, { status: 413 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = `${session.user.email}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(safeName, file, {
    access: "private",
    contentType: file.type || "application/octet-stream",
  });

  // Return a proxied URL so private blobs are served through our auth-gated route
  const proxyUrl = `/api/blob?url=${encodeURIComponent(blob.url)}`;

  const type = file.type.startsWith("image/") ? "image"
    : file.type === "application/pdf" ? "pdf"
    : "document";

  return NextResponse.json({
    url: proxyUrl,
    type,
    name: file.name,
    size: file.size,
  });
}
