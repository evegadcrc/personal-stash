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
}
