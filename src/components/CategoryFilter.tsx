"use client";

const CATEGORIES = [
  "All Activities",
  "Art & Creative",
  "Outdoors",
  "Food & Drink",
  "Workshops",
  "Fitness",
  "Music",
  "Sports",
  "Community",
  "Nightlife",
];

interface CategoryFilterProps {
  selected: string;
  onChange: (cat: string) => void;
}

export default function CategoryFilter({
  selected,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`display-font whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            selected === cat
              ? "bg-teal-600 text-teal-200 shadow-[0_10px_24px_rgb(0,102,102,0.16)]"
              : "bg-coral-200 text-coral-900 hover:bg-coral-250"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
