"use client";

import { useState, useEffect, useRef } from "react";

// Exact hex values from Tailwind v4's generated output for zinc palette
const THEME_VARS = {
  dark: {
    "--color-zinc-950": "#09090b",
    "--color-zinc-900": "#18181b",
    "--color-zinc-800": "#27272a",
    "--color-zinc-700": "#3f3f46",
    "--color-zinc-600": "#52525c",
    "--color-zinc-500": "#71717b",
    "--color-zinc-400": "#9f9fa9",
    "--color-zinc-300": "#d4d4d8",
    "--color-zinc-200": "#e4e4e7",
    "--color-zinc-100": "#f4f4f5",
    "--color-zinc-50":  "#fafafa",
  },
  light: {
    "--color-zinc-950": "#ffffff",
    "--color-zinc-900": "#f4f4f5",
    "--color-zinc-800": "#e4e4e7",
    "--color-zinc-700": "#d4d4d8",
    "--color-zinc-600": "#a1a1aa",
    "--color-zinc-500": "#71717a",
    "--color-zinc-400": "#52525b",
    "--color-zinc-300": "#3f3f46",
    "--color-zinc-200": "#27272a",
    "--color-zinc-100": "#18181b",
    "--color-zinc-50":  "#09090b",
  },
  ocean: {
    "--color-zinc-950": "#040d1a",
    "--color-zinc-900": "#071526",
    "--color-zinc-800": "#0d2040",
    "--color-zinc-700": "#1a3a60",
    "--color-zinc-600": "#2e5c8c",
    "--color-zinc-500": "#5090b8",
    "--color-zinc-400": "#88bcd8",
    "--color-zinc-300": "#b8d8ec",
    "--color-zinc-200": "#d8edf8",
    "--color-zinc-100": "#e8f4fd",
    "--color-zinc-50":  "#f5faff",
  },
} as const;

export type ThemeId = keyof typeof THEME_VARS;

const THEMES: { id: ThemeId; name: string; swatches: [string, string, string] }[] = [
  { id: "dark",   name: "Dark",   swatches: ["#09090b", "#27272a", "#f4f4f5"] },
  { id: "light",  name: "Light",  swatches: ["#ffffff", "#e4e4e7", "#18181b"] },
  { id: "ocean",  name: "Ocean",  swatches: ["#040d1a", "#0d2040", "#e8f4fd"] },
];

export function applyThemeVars(id: ThemeId) {
  const vars = THEME_VARS[id];
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}

function PaletteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="7.5" cy="7.5" r="6.5" />
      <circle cx="5"   cy="5"   r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10"  cy="5"   r="1.2" fill="currentColor" stroke="none" />
      <circle cx="5"   cy="10"  r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10"  cy="10"  r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // On mount: restore saved theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stash-theme") as ThemeId | null;
      if (saved && saved in THEME_VARS) {
        setTheme(saved);
        applyThemeVars(saved);
      }
    } catch {}
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function applyTheme(id: ThemeId) {
    setTheme(id);
    setOpen(false);
    applyThemeVars(id);
    try { localStorage.setItem("stash-theme", id); } catch {}
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        aria-label="Change theme"
        title="Change theme"
      >
        <PaletteIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 flex flex-col gap-0.5 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl w-40">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors text-left w-full ${
                theme === t.id
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <span className="flex gap-0.5 shrink-0">
                {t.swatches.map((color, i) => (
                  <span
                    key={i}
                    className="inline-block h-3 w-3 rounded-full border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="flex-1">{t.name}</span>
              {theme === t.id && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
