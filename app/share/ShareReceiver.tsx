"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  title?: string;
  text?: string;
  url?: string;
}

// Receives a shared URL/text from Android and redirects home with a pre-fill param
// so the AddItemModal can open and pre-populate the URL field.
export default function ShareReceiver({ title, text, url }: Props) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // Build the target URL — prefer explicit url, fall back to url-like content in text
    const sharedUrl = url || (text?.startsWith("http") ? text : undefined);
    const sharedText = !sharedUrl ? (text || title) : undefined;

    const qs = new URLSearchParams();
    if (sharedUrl) qs.set("shareUrl", sharedUrl);
    else if (sharedText) qs.set("shareText", sharedText);

    router.replace(`/?${qs.toString()}`);
  }, [router, title, text, url]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-sm text-zinc-500">Opening Personal Stash…</p>
    </div>
  );
}
