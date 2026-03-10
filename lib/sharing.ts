import { prisma } from "./db";
import { prismaToItem, Item } from "./data";

export interface ShareWithOwner {
  id: string;
  ownerEmail: string;
  ownerName: string | null;
  ownerAvatar: string | null;
  categoryName: string;
  mode: "whitelist" | "public";
  allowedEmails: string[];
  itemCount: number;
}

export interface FriendData {
  email: string;
  name: string | null;
  avatar: string | null;
  friendshipId: string;
  status: "accepted" | "pending";
  direction: "sent" | "received";
}

export async function getSharedCategoriesForUser(email: string): Promise<ShareWithOwner[]> {
  const shares = await prisma.share.findMany({
    where: {
      OR: [
        { mode: "public" },
        { mode: "whitelist", allowedEmails: { has: email } },
      ],
      NOT: { ownerEmail: email },
    },
    include: { owner: true },
  });

  const result: ShareWithOwner[] = [];
  for (const share of shares) {
    // Owner's items in the category
    const ownerCount = await prisma.item.count({
      where: { ownerEmail: share.ownerEmail, category: share.categoryName },
    });
    // Contributed items via memberships
    const memberCount = await prisma.sharedMembership.count({
      where: { shareId: share.id },
    });
    result.push({
      id: share.id,
      ownerEmail: share.ownerEmail,
      ownerName: share.owner.name,
      ownerAvatar: share.owner.avatar,
      categoryName: share.categoryName,
      mode: share.mode as "whitelist" | "public",
      allowedEmails: share.allowedEmails,
      itemCount: ownerCount + memberCount,
    });
  }
  return result;
}

export async function getPendingRequestsCount(email: string): Promise<number> {
  return prisma.friendship.count({
    where: { toEmail: email, status: "pending" },
  });
}

export async function getFriendsForUser(email: string): Promise<FriendData[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ fromEmail: email }, { toEmail: email }],
      status: { in: ["accepted", "pending"] },
    },
    include: { sender: true, receiver: true },
  });

  return friendships.map((f) => {
    const isSender = f.fromEmail === email;
    const other = isSender ? f.receiver : f.sender;
    return {
      email: other.email,
      name: other.name,
      avatar: other.avatar,
      friendshipId: f.id,
      status: f.status as "accepted" | "pending",
      direction: isSender ? "sent" : "received",
    };
  });
}

export async function assembleSharedCategoryItems(
  share: { id: string; ownerEmail: string; categoryName: string },
  viewerEmail?: string
): Promise<Item[]> {
  // Owner's items in their category (always included, no membership needed)
  const ownerItems = await prisma.item.findMany({
    where: { ownerEmail: share.ownerEmail, category: share.categoryName },
    orderBy: { dateAdded: "desc" },
  });

  // Items added by contributors via SharedMembership
  const memberships = await prisma.sharedMembership.findMany({
    where: { shareId: share.id },
    include: { item: true },
    orderBy: { addedAt: "desc" },
  });

  // Exclude any membership items that are already owner items (edge case: owner links own item)
  const ownerItemIds = new Set(ownerItems.map((i) => i.id));
  const contributedItems = memberships
    .filter((m) => !ownerItemIds.has(m.itemId))
    .map((m) => prismaToItem(m.item, { addedBy: m.addedBy, membershipId: m.id }));

  const allItems = [...ownerItems.map((i) => prismaToItem(i)), ...contributedItems];

  // Overlay per-user read status for non-owner viewers
  if (viewerEmail && viewerEmail !== share.ownerEmail) {
    const readRecords = await prisma.userItemRead.findMany({
      where: { userEmail: viewerEmail, itemId: { in: allItems.map((i) => i.id) } },
      select: { itemId: true },
    });
    const readSet = new Set(readRecords.map((r) => r.itemId));
    return allItems.map((i) => ({ ...i, read: readSet.has(i.id) }));
  }

  return allItems;
}

export async function getMyShares(email: string) {
  return prisma.share.findMany({
    where: { ownerEmail: email },
    orderBy: { categoryName: "asc" },
  });
}

export async function hasShareAccess(shareId: string, email: string): Promise<{
  hasAccess: boolean;
  share: { id: string; ownerEmail: string; categoryName: string; mode: string; allowedEmails: string[] } | null;
}> {
  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) return { hasAccess: false, share: null };

  const hasAccess =
    share.ownerEmail === email ||
    share.mode === "public" ||
    share.allowedEmails.includes(email);

  return { hasAccess, share };
}
