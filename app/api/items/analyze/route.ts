import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

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
  const { url, text, imageBase64, mediaType } = (await request.json()) as {
    url?: string;
    text?: string;
    imageBase64?: string;
    mediaType?: string;
  };

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

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text;

  // Strip possible markdown code fences
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }
}
