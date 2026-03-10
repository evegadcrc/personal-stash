import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ShareReceiver from "./ShareReceiver";

interface Props {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}

export default async function SharePage({ searchParams }: Props) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.email) {
    // Preserve share params through login redirect
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/login?callbackUrl=/share${qs ? `%3F${qs}` : ""}`);
  }

  return <ShareReceiver title={params.title} text={params.text} url={params.url} />;
}
