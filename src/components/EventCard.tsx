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
  priority?: boolean;
  onSave?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
}

export default function EventCard({
  event,
  groupCount = 0,
  saved = false,
  priority = false,
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
      <div className="surface-card overflow-hidden rounded-[32px] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_26px_44px_rgb(78,33,30,0.1)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-coral-150">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral-250 via-coral-100 to-teal-100">
              <span className="text-4xl">🎯</span>
            </div>
          )}

          <div className="absolute left-4 top-4 rounded-full bg-teal-600 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200 shadow-[0_12px_30px_rgb(0,102,102,0.22)]">
            <span>🔴</span>
            {formatDate(event.start_time)}
          </div>

          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <button
              onClick={handleSave}
              title={isSaved ? "Saved" : "Save"}
              className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition ${
                isSaved
                  ? "bg-coral-600 text-white"
                  : "bg-white/85 text-coral-600 hover:bg-white"
              }`}
            >
              <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={handleDismiss}
              title="Not interested"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-coral-900/55 backdrop-blur-md hover:bg-white hover:text-coral-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="absolute bottom-4 left-4">
            <span className="rounded-full bg-coral-250/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600 backdrop-blur-md">
              {groupCount} squads going
            </span>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5">
          <span className="display-font text-[11px] font-bold uppercase tracking-[0.2em] text-coral-600">
            {event.category}
          </span>

          <h3 className="display-font text-2xl font-extrabold leading-tight text-coral-900">
            {event.title}
          </h3>
          <p className="flex items-center gap-1 text-sm font-medium text-coral-900/65">
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

          <div className="flex flex-wrap gap-2">
            {(event.tags || []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-coral-100 px-3 py-1 text-[11px] font-bold text-coral-900/70"
              >
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
