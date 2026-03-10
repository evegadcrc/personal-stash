import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Analyze this content for a personal knowledge base. Return JSON only (no markdown, no explanation):
{
  "title": "concise title",
  "summary": "2-4 sentence summary",
  "category": "ai | movies | places | ideas | bookmarks (or a new lowercase word)",
  "subcategory": "relevant subcategory",
  "tags": ["tag1", "tag2"],
  "url": "original url if present, else null",
  "source": "web | manual"
}
Tags: max 5, lowercase, no spaces. Use hyphens for multi-word tags.`;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 8000);
}

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;

  const { url, text, imageBase64, mediaType } = (await request.json()) as {
    url?: string;
    text?: string;
    imageBase64?: string;
    mediaType?: string;
  };

  // Auto-download PDF URLs and store in Blob
  let pdfAttachment: { url: string; type: string; name: string; size: number } | null = null;
  if (url && email && /\.pdf(\?.*)?$/i.test(url)) {
    try {
      const pdfRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StashBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (pdfRes.ok) {
        const buffer = await pdfRes.arrayBuffer();
        const fileName = url.split("/").pop()?.split("?")[0] ?? "document.pdf";
        const safeName = `${email}/${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
        const blob = await put(safeName, Buffer.from(buffer), {
          access: "public",
          contentType: "application/pdf",
        });
        pdfAttachment = { url: blob.url, type: "pdf", name: fileName, size: buffer.byteLength };
      }
    } catch {
      // non-fatal — continue without PDF attachment
    }
  }

  let content: Anthropic.MessageParam["content"];

  if (imageBase64 && mediaType) {
    content = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: imageBase64,
        },
      },
      { type: "text", text: "Analyze this image for my knowledge base." },
    ];
  } else {
    let rawText = text ?? "";

    if (url) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; StashBot/1.0)" },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        rawText = `URL: ${url}\n\n${stripHtml(html)}`;
      } catch {
        rawText = `URL: ${url}`;
      }
    }

    content = rawText;
  }

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message ?? "Anthropic API error" }, { status: err.status ?? 500 });
  }

  const raw = (message.content[0] as { type: string; text: string }).text;

  // Strip possible markdown code fences
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (pdfAttachment) parsed.attachments = [pdfAttachment];
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }
}
