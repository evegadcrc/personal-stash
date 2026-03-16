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
}

export default function TourOverlay({ onComplete }: TourOverlayProps) {
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

  useEffect(() => {
    if (!currentStep?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        width: 360,
      };
    }
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const tooltipW = 320;
    const belowSpace = vh - (rect.top + rect.height + PAD);
    const aboveSpace = rect.top - PAD;
    const top =
      belowSpace >= 180 || belowSpace > aboveSpace
        ? rect.top + rect.height + PAD + 12
        : rect.top - PAD - 200;
    const left = Math.min(Math.max(rect.left - PAD, 16), vw - tooltipW - 16);
    return { position: "fixed", top, left, zIndex: 9999, width: tooltipW };
  })();

  const isLast = stepIndex === activeSteps.length - 1;

  return (
    <>
      {!rect && <div className="fixed inset-0 bg-black/78 z-[9997]" />}
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
