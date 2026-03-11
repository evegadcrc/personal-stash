import { prisma } from "@/lib/db";

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

  // 1. Persist in-app notifications — always runs, no web-push dependency
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

  // 2. Web push — completely optional, isolated in its own try/catch
  //    Uses dynamic import so a load failure can never affect step 1.
  try {
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) return;

    const subs = await prisma.pushSubscription.findMany({
      where: { userEmail: { in: recipients } },
    });
    if (subs.length === 0) return;

    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@stash.app",
      vapidPublic,
      vapidPrivate
    );

    const actor = actorName ?? actorEmail.split("@")[0];
    const payload = JSON.stringify({
      title: `New item in ${categoryName}`,
      body: `${actor} added "${itemTitle}"`,
      shareId,
      categoryName,
      itemId,
    });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch((err: { statusCode?: number }) => {
          if (err?.statusCode === 410) {
            return prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
          }
        })
      )
    );
  } catch (err) {
    console.error("[web-push] failed to send push notifications:", err);
  }
}
