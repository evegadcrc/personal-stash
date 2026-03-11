import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDigestEmail } from "@/lib/email";
import { Resend } from "resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://personal-stash.vercel.app";

export async function GET(request: Request) {
  // Verify Vercel cron secret (or allow in dev with no secret set)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weekLabel = `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Get all users who want the digest
  const users = await prisma.user.findMany({
    where: { weeklyDigest: true },
    select: { email: true, name: true },
  });

  const results: { email: string; status: string }[] = [];

  for (const user of users) {
    try {
      const allItems = await prisma.item.findMany({
        where: { ownerEmail: user.email, sharedOnly: false },
        select: { title: true, summary: true, url: true, category: true, dateAdded: true, read: true },
        orderBy: { dateAdded: "desc" },
      });

      // Skip users with no items
      if (allItems.length === 0) continue;

      const newItems = allItems.filter((i) => i.dateAdded >= weekAgo);
      const unreadItems = allItems.filter((i) => !i.read);
      const staleCount = allItems.filter((i) => !i.read && i.dateAdded < thirtyDaysAgo).length;

      // Group new items by category
      const newItemsByCategory: Record<string, { title: string; summary: string; url: string | null; category: string }[]> = {};
      for (const item of newItems) {
        if (!newItemsByCategory[item.category]) newItemsByCategory[item.category] = [];
        newItemsByCategory[item.category].push({
          title: item.title,
          summary: item.summary,
          url: item.url,
          category: item.category,
        });
      }

      const { subject, html } = buildDigestEmail({
        userName: user.name?.split(" ")[0] ?? user.email.split("@")[0],
        weekLabel,
        newCount: newItems.length,
        unreadCount: unreadItems.length,
        totalCount: allItems.length,
        staleCount,
        newItemsByCategory,
        appUrl: APP_URL,
      });

      await resend.emails.send({
        from: "Personal Stash <digest@resend.dev>",
        to: user.email,
        subject,
        html,
      });

      results.push({ email: user.email, status: "sent" });
    } catch (err) {
      results.push({ email: user.email, status: `error: ${(err as Error).message}` });
    }
  }

  return NextResponse.json({ ok: true, sent: results.length, results });
}
