"use client";

interface SubcategoryFilterProps {
  subcategories: string[];
  selected: string | null;
  onSelect: (sub: string | null) => void;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SubcategoryFilter({
  subcategories,
  selected,
  onSelect,
}: SubcategoryFilterProps) {
  if (subcategories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selected === null
            ? "bg-zinc-100 text-zinc-900"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        }`}
      >
        All
      </button>
      {subcategories.map((sub) => (
        <button
          key={sub}
          onClick={() => onSelect(sub)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selected === sub
              ? "bg-zinc-100 text-zinc-900"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          }`}
        >
          {capitalize(sub)}
        </button>
      ))}
    </div>
  );
}
