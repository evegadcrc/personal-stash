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

export async function getSharedCategoriesForUser(
  email: string
): Promise<ShareWithOwner[]> {
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
    const itemCount = await prisma.item.count({
      where: {
        OR: [
          {
            ownerEmail: share.ownerEmail,
            category: share.categoryName,
            shareId: null,
          },
          { shareId: share.id },
        ],
      },
    });
    result.push({
      id: share.id,
      ownerEmail: share.ownerEmail,
      ownerName: share.owner.name,
      ownerAvatar: share.owner.avatar,
      categoryName: share.categoryName,
      mode: share.mode as "whitelist" | "public",
      allowedEmails: share.allowedEmails,
      itemCount,
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

export async function assembleSharedCategoryItems(share: {
  id: string;
  ownerEmail: string;
  categoryName: string;
}): Promise<Item[]> {
  const items = await prisma.item.findMany({
    where: {
      OR: [
        {
          ownerEmail: share.ownerEmail,
          category: share.categoryName,
          shareId: null,
        },
        { shareId: share.id },
      ],
    },
    orderBy: { dateAdded: "desc" },
  });
  return items.map(prismaToItem);
}

export async function getMyShares(email: string) {
  return prisma.share.findMany({
    where: { ownerEmail: email },
    orderBy: { categoryName: "asc" },
  });
}
