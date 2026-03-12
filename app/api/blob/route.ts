import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Proxy route for private Vercel Blob files.
// Verifies the user is authenticated before streaming the blob.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Validate it's a real Vercel Blob URL to prevent SSRF
  if (!url.startsWith("https://") || !url.includes(".blob.vercel-storage.com/")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const result = await get(url, { access: "private" });
  if (!result || result.statusCode === 304) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": result.blob.contentDisposition || "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
