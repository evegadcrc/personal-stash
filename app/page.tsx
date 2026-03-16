import { getAllCategories } from "@/lib/data";
import { getSharedCategoriesForUser, getPendingRequestsCount } from "@/lib/sharing";
import KnowledgeBase from "@/components/KnowledgeBase";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

interface HomeProps {
  searchParams: Promise<{
    shareUrl?: string;
    shareText?: string;
    itemId?: string;
    shareId?: string;
    categoryName?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const params = await searchParams;

  const [categories, sharedCategories, pendingCount, dbUser] = await Promise.all([
    getAllCategories(email),
    email ? getSharedCategoriesForUser(email) : Promise.resolve([]),
    email ? getPendingRequestsCount(email) : Promise.resolve(0),
    email ? prisma.user.findUnique({ where: { email }, select: { tourCompleted: true } }) : Promise.resolve(null),
  ]);

  return (
    <KnowledgeBase
      categories={categories}
      user={session?.user}
      sharedCategories={sharedCategories}
      pendingCount={pendingCount}
      currentUserEmail={email}
      aiAvailable={false}
      tourCompleted={dbUser?.tourCompleted ?? false}
      shareUrl={params.shareUrl}
      shareText={params.shareText}
      initialItemId={params.itemId}
      initialShareId={params.shareId}
      initialCategoryName={params.categoryName}
    />
  );
}
