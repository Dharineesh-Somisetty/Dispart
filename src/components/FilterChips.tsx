"use client";

interface FilterChipsProps {
  filters: { key: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function FilterChips({
  filters,
  selected,
  onChange,
}: FilterChipsProps) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => {
        const active = selected.includes(f.key);
        return (
          <button
            key={f.key}
            onClick={() => toggle(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              active
                ? "bg-coral-500 text-white border-coral-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
