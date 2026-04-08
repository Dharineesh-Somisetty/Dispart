"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;

  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${day}, ${time}`;
}

interface EventCardProps {
  event: Event;
  groupCount?: number;
  saved?: boolean;
  onSave?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
}

export default function EventCard({
  event,
  groupCount = 0,
  saved = false,
  onSave,
  onDismiss,
}: EventCardProps) {
  const [isSaved, setIsSaved] = useState(saved);
  const [dismissed, setDismissed] = useState(false);

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("event_interactions").insert({
      user_id: user.id,
      event_id: event.id,
      type: "save",
    });

    setIsSaved(true);
    onSave?.(event.id);
  }

  async function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("event_interactions").insert({
      user_id: user.id,
      event_id: event.id,
      type: "dismiss",
    });

    setDismissed(true);
    onDismiss?.(event.id);
  }

  if (dismissed) return null;

  return (
    <Link href={`/activities/${event.id}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-coral-100 to-teal-100 flex items-center justify-center">
              <span className="text-4xl">🎯</span>
            </div>
          )}

          {/* Date badge */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 bg-teal-500/90 text-white">
            <span>🔴</span>
            {formatDate(event.start_time)}
          </div>

          {/* Save / Dismiss buttons */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button
              onClick={handleSave}
              title={isSaved ? "Saved" : "Save"}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                isSaved
                  ? "bg-coral-500 text-white"
                  : "bg-white/90 text-gray-500 hover:text-coral-500"
              }`}
            >
              <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={handleDismiss}
              title="Not interested"
              className="w-8 h-8 rounded-full bg-white/90 text-gray-400 hover:text-gray-600 flex items-center justify-center transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <span className="text-[10px] font-medium text-teal-600 uppercase tracking-wider">
            {event.category}
          </span>

          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 mt-0.5">
            {event.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {event.venue_name || event.area_label}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-medium text-teal-600">
              {groupCount} squad{groupCount !== 1 ? "s" : ""} going
            </span>

            <div className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
