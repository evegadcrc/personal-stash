import { getAllCategories } from "@/lib/data";
import KnowledgeBase from "@/components/KnowledgeBase";

export default function Home() {
  const categories = getAllCategories();
  return <KnowledgeBase categories={categories} />;
}
