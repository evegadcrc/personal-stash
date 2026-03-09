import { getAllCategories } from "@/lib/data";
import { getSharedCategoriesForUser, getPendingRequestsCount } from "@/lib/sharing";
import KnowledgeBase from "@/components/KnowledgeBase";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  const email = session?.user?.email ?? "";

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
    />
  );
}
