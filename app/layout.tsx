import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Info — Personal Knowledge Base",
  description: "Personal knowledge base for AI, movies, places, ideas and bookmarks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
