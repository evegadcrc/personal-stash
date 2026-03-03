import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stash — Personal Knowledge Base",
  description: "Personal knowledge base for AI, movies, places, ideas and bookmarks.",
};

// Runs before first paint — prevents flash of wrong theme.
// Mirrors the THEME_VARS map in ThemeToggle.tsx.
const ANTI_FLASH_SCRIPT = `(function(){
  try{
    var t=localStorage.getItem('stash-theme');
    if(!t)return;
    var T={
      dark:{'--color-zinc-950':'#09090b','--color-zinc-900':'#18181b','--color-zinc-800':'#27272a','--color-zinc-700':'#3f3f46','--color-zinc-600':'#52525c','--color-zinc-500':'#71717b','--color-zinc-400':'#9f9fa9','--color-zinc-300':'#d4d4d8','--color-zinc-200':'#e4e4e7','--color-zinc-100':'#f4f4f5','--color-zinc-50':'#fafafa'},
      light:{'--color-zinc-950':'#ffffff','--color-zinc-900':'#f4f4f5','--color-zinc-800':'#e4e4e7','--color-zinc-700':'#d4d4d8','--color-zinc-600':'#a1a1aa','--color-zinc-500':'#71717a','--color-zinc-400':'#52525b','--color-zinc-300':'#3f3f46','--color-zinc-200':'#27272a','--color-zinc-100':'#18181b','--color-zinc-50':'#09090b'},
      ocean:{'--color-zinc-950':'#040d1a','--color-zinc-900':'#071526','--color-zinc-800':'#0d2040','--color-zinc-700':'#1a3a60','--color-zinc-600':'#2e5c8c','--color-zinc-500':'#5090b8','--color-zinc-400':'#88bcd8','--color-zinc-300':'#b8d8ec','--color-zinc-200':'#d8edf8','--color-zinc-100':'#e8f4fd','--color-zinc-50':'#f5faff'},
    };
    var v=T[t];if(!v)return;
    var r=document.documentElement;
    for(var k in v)r.style.setProperty(k,v[k]);
  }catch(e){}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
