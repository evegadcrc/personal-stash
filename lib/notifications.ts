import { prisma } from "@/lib/db";
import webpush from "web-push";

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@stash.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface NotifyShareMembersArgs {
  shareId: string;
  ownerEmail: string;
  allowedEmails: string[];
  categoryName: string;
  actorEmail: string;
  actorName: string | null;
  itemId: string;
  itemTitle: string;
}

export async function notifyShareMembers({
  shareId,
  ownerEmail,
  allowedEmails,
  categoryName,
  actorEmail,
  actorName,
  itemId,
  itemTitle,
}: NotifyShareMembersArgs) {
  const recipients = [ownerEmail, ...allowedEmails].filter((e) => e !== actorEmail);
  if (recipients.length === 0) return;

  // 1. Persist in-app notifications
  await prisma.notification.createMany({
    data: recipients.map((toEmail) => ({
      toEmail,
      fromEmail: actorEmail,
      fromName: actorName ?? null,
      type: "item_shared",
      itemId,
      itemTitle,
      shareId,
      categoryName,
    })),
    skipDuplicates: false,
  });

  // 2. Send web push to every subscribed device for each recipient
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

  const actor = actorName ?? actorEmail.split("@")[0];
  const payload = JSON.stringify({
    title: `New item in ${categoryName}`,
    body: `${actor} added "${itemTitle}"`,
    shareId,
    categoryName,
  });

  const subs = await prisma.pushSubscription.findMany({
    where: { userEmail: { in: recipients } },
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch((err: { statusCode?: number }) => {
        // 410 Gone = subscription expired, clean it up
        if (err?.statusCode === 410) {
          return prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
        }
      })
    )
  );
}
