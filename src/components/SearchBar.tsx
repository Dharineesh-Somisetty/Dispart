"use client";

import { useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search activities, venues, hobbies...",
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 rounded-[24px] px-5 py-4 transition ${
        focused
          ? "bg-white shadow-[0_18px_40px_rgb(78,33,30,0.08)]"
          : "bg-coral-100"
      }`}
    >
      <svg
        className="h-4 w-4 shrink-0 text-coral-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-coral-900 placeholder:text-coral-900/45 outline-none"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-coral-600 hover:bg-white"
        >
          &times;
        </button>
      )}
    </div>
  );
}
