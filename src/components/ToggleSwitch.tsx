"use client";

interface ToggleSwitchProps {
  value: "WATCH" | "DO" | "ALL";
  onChange: (val: "WATCH" | "DO" | "ALL") => void;
}

export default function ToggleSwitch({ value, onChange }: ToggleSwitchProps) {
  const options: { key: "WATCH" | "DO" | "ALL"; label: string; sub: string }[] =
    [
      { key: "WATCH", label: "WATCH", sub: "Spectate & Vibe" },
      { key: "DO", label: "DO", sub: "Get involved" },
      { key: "ALL", label: "ALL", sub: "Everything" },
    ];

  return (
    <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            value === opt.key
              ? opt.key === "DO"
                ? "bg-teal-500 text-white shadow-sm"
                : opt.key === "WATCH"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "bg-coral-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="block leading-tight">{opt.label}</span>
          <span className="block text-[10px] font-normal opacity-70">
            {opt.sub}
          </span>
        </button>
      ))}
    </div>
  );
}
