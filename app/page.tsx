import { getAllCategories } from "@/lib/data";
import KnowledgeBase from "@/components/KnowledgeBase";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const categories = getAllCategories(email);
  return <KnowledgeBase categories={categories} user={session?.user} />;
}
