"use client";

import { useState, useRef } from "react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
}

export default function ChatComposer({
  onSend,
  onTyping,
  disabled = false,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const lastTypingRef = useRef(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
    // Throttle typing indicator to once per 2 seconds
    if (onTyping && Date.now() - lastTypingRef.current > 2000) {
      lastTypingRef.current = Date.now();
      onTyping();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-4 mb-4 mt-2 flex items-center gap-3 rounded-full bg-white/88 p-3 ambient-shadow backdrop-blur-lg"
    >
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Message the squad..."
        disabled={disabled}
        className="flex-1 rounded-full bg-coral-50 px-4 py-3 text-sm text-coral-900 placeholder:text-coral-900/45 outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="gradient-cta flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_14px_28px_rgb(160,58,15,0.2)] disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </form>
  );
}
