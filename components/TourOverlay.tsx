"use client";

import { useEffect, useState, useCallback } from "react";

interface Step {
  id: string;
  title: string;
  description: string;
  target: string | null;
}

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to Personal Stash",
    description: "Your personal knowledge base. Save links, notes, and ideas — organized and searchable. Let's take a quick tour.",
    target: null,
  },
  {
    id: "sidebar",
    title: "Your Categories",
    description: "Your content is organized into categories here. Click one to browse. Categories are created automatically as you add items.",
    target: "sidebar",
  },
  {
    id: "add-button",
    title: "Add Anything",
    description: "Click + to save a link, paste text, or upload an image. AI fills in the title, summary, and tags automatically.",
    target: "add-button",
  },
  {
    id: "item-card",
    title: "Your Items",
    description: "Each card shows the title, summary, and tags. Click to expand, mark as read, rate, or add to a collection.",
    target: "item-card",
  },
  {
    id: "share-button",
    title: "Share with Friends",
    description: "Select a category, then click Share to invite friends. They can browse — or contribute to — your shared categories.",
    target: "share-button",
  },
  {
    id: "search",
    title: "Search Everything",
    description: "Search across all your items by title, summary, or tags — instantly.",
    target: "search-bar",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  onComplete: () => void;
  onStep?: (stepId: string) => void;
}

const TOOLTIP_W = 300;
const TOOLTIP_H = 210; // approximate height

export default function TourOverlay({ onComplete, onStep }: TourOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [activeSteps, setActiveSteps] = useState<Step[]>(STEPS);

  const rebuildActiveSteps = useCallback(() => {
    return STEPS.filter((s) => {
      if (!s.target) return true;
      return !!document.querySelector(`[data-tour="${s.target}"]`);
    });
  }, []);

  useEffect(() => {
    setActiveSteps(rebuildActiveSteps());
  }, [rebuildActiveSteps]);

  const currentStep = activeSteps[stepIndex] ?? activeSteps[activeSteps.length - 1];

  // Notify parent when step changes (e.g. to open sidebar)
  useEffect(() => {
    if (currentStep) onStep?.(currentStep.id);
  }, [currentStep, onStep]);

  // Measure rect after a settle delay (allows CSS transitions like sidebar slide-in to finish)
  useEffect(() => {
    if (!currentStep?.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      // If the element is off-screen (e.g. sidebar still animating), skip spotlight
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const visible = r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh;
      if (!visible) { setRect(null); return; }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // 320ms — enough to clear the sidebar's 200ms transition + a little buffer
    const timer = setTimeout(measure, 320);
    return () => clearTimeout(timer);
  }, [currentStep, stepIndex]);

  function handleNext() {
    if (stepIndex < activeSteps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }

  function handleBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  const PAD = 10;

  const spotlightStyle: React.CSSProperties | undefined = rect
    ? {
        position: "fixed",
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 10,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
        zIndex: 9998,
        pointerEvents: "none",
        transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
      }
    : undefined;

  const tooltipStyle: React.CSSProperties = (() => {
    if (!rect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        width: Math.min(TOOLTIP_W, (typeof window !== "undefined" ? window.innerWidth : 400) - 32),
      };
    }

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const w = Math.min(TOOLTIP_W, vw - 32);

    // Prefer below, fall back to above, fall back to centered
    const belowTop = rect.top + rect.height + PAD + 12;
    const aboveTop = rect.top - PAD - TOOLTIP_H - 12;

    let top: number;
    if (belowTop + TOOLTIP_H <= vh - 16) {
      top = belowTop;
    } else if (aboveTop >= 16) {
      top = aboveTop;
    } else {
      // Element too tall (e.g. full-height sidebar) — float tooltip at safe center
      top = Math.max(16, Math.min((vh - TOOLTIP_H) / 2, vh - TOOLTIP_H - 16));
    }

    // Horizontal: prefer aligning with element left, but stay within viewport
    // If element is on the left side (sidebar), push tooltip to the right of it
    const elementRight = rect.left + rect.width;
    let left: number;
    if (elementRight + 16 + w <= vw) {
      // Enough room to the right of the element
      left = elementRight + 16;
    } else {
      left = Math.min(Math.max(rect.left - PAD, 16), vw - w - 16);
    }

    return { position: "fixed", top, left, zIndex: 9999, width: w };
  })();

  const isLast = stepIndex === activeSteps.length - 1;

  return (
    <>
      {!rect && <div className="fixed inset-0 bg-black/75 z-[9997]" />}
      {spotlightStyle && <div style={spotlightStyle} />}

      <div style={tooltipStyle} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-zinc-100">{currentStep?.title}</h3>
          <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
            {stepIndex + 1} / {activeSteps.length}
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">{currentStep?.description}</p>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={handleBack}
              className="h-8 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={onComplete}
            className="h-8 rounded-lg px-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="ml-auto h-8 rounded-lg bg-zinc-100 px-4 text-xs font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            {isLast ? "Done" : "Next →"}
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {activeSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === stepIndex ? "w-4 bg-zinc-300" : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
