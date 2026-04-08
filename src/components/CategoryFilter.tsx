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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition ${
            selected === cat
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
