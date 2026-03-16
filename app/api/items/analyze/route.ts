import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

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

function extractOgTags(html: string) {
  const prop = (name: string) =>
    html.match(new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"'<>]+)["']`, "i"))?.[1] ||
    html.match(new RegExp(`<meta[^>]*content=["']([^"'<>]+)["'][^>]*property=["']${name}["']`, "i"))?.[1];
  const meta = (name: string) =>
    html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"'<>]+)["']`, "i"))?.[1] ||
    html.match(new RegExp(`<meta[^>]*content=["']([^"'<>]+)["'][^>]*name=["']${name}["']`, "i"))?.[1];
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  return {
    title: prop("og:title") || meta("twitter:title") || title,
    description: prop("og:description") || meta("twitter:description") || meta("description"),
    type: prop("og:type"),
  };
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

  type MessageContent =
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;

  let content: MessageContent;

  if (imageBase64 && mediaType) {
    content = [
      { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
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
        const og = extractOgTags(html);
        const body = stripHtml(html);

        const parts = [`URL: ${url}`];
        if (og.title) parts.push(`Title: ${og.title}`);
        if (og.description) parts.push(`Description: ${og.description}`);
        if (og.type) parts.push(`Type: ${og.type}`);
        if (body.length > 100) parts.push(`\nContent:\n${body}`);

        rawText = parts.join("\n");
      } catch {
        rawText = `URL: ${url}`;
      }
    }

    content = rawText;
  }

  let data: { choices: Array<{ message: { content: string } }> };
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stash.vercel.app",
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5-8b",
        max_tokens: 512,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    data = await res.json();
  } catch (e) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err.message ?? "OpenRouter API error" }, { status: 500 });
  }

  const raw = data.choices[0].message.content;

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
