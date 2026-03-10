import { getAllCategories } from "@/lib/data";
import { getSharedCategoriesForUser, getPendingRequestsCount } from "@/lib/sharing";
import KnowledgeBase from "@/components/KnowledgeBase";
import { auth } from "@/auth";

interface HomeProps {
  searchParams: Promise<{ shareUrl?: string; shareText?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const params = await searchParams;

  const [categories, sharedCategories, pendingCount] = await Promise.all([
    getAllCategories(email),
    email ? getSharedCategoriesForUser(email) : Promise.resolve([]),
    email ? getPendingRequestsCount(email) : Promise.resolve(0),
  ]);

  return (
    <KnowledgeBase
      categories={categories}
      user={session?.user}
      sharedCategories={sharedCategories}
      pendingCount={pendingCount}
      currentUserEmail={email}
      aiAvailable={!!process.env.ANTHROPIC_API_KEY}
      shareUrl={params.shareUrl}
      shareText={params.shareText}
    />
  );
}
