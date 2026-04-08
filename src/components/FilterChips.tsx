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
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
              active
                ? "bg-teal-600 text-teal-200 shadow-[0_10px_24px_rgb(0,102,102,0.14)]"
                : "bg-coral-200 text-coral-900/70 hover:bg-coral-250"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
