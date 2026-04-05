"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import type { Organizer, Event } from "@/lib/types";

export default function OrganizerProfilePage() {
  const params = useParams();
  const organizerId = params.id as string;

  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [events, setEvents] = useState<(Event & { group_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: orgData } = await supabase
        .from("organizers")
        .select("*")
        .eq("id", organizerId)
        .single();

      if (!orgData) {
        setLoading(false);
        return;
      }
      setOrganizer(orgData as Organizer);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*, groups(id)")
        .eq("organizer_id", organizerId)
        .eq("status", "active")
        .order("start_time", { ascending: true });

      const mapped = (eventsData || []).map((e) => {
        const rec = e as Record<string, unknown>;
        return {
          ...e,
          groups: undefined,
          group_count: Array.isArray(rec.groups)
            ? (rec.groups as unknown[]).length
            : 0,
        };
      }) as (Event & { group_count: number })[];

      setEvents(mapped);
      setLoading(false);
    }

    load();
  }, [organizerId, supabase]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-2xl" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </>
    );
  }

  if (!organizer) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 text-center py-20 text-gray-400">
          Organizer not found
        </div>
      </>
    );
  }

  const TYPE_LABELS: Record<string, string> = {
    nonprofit: "Nonprofit",
    venue: "Venue",
    company: "Company",
    musician: "Musician",
    community: "Community Org",
    individual: "Individual",
  };

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            {organizer.logo_url ? (
              <img
                src={organizer.logo_url}
                alt={organizer.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-coral-100 to-teal-100 flex items-center justify-center text-2xl font-bold text-coral-500">
                {organizer.name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  {organizer.name}
                </h1>
                {organizer.verified && (
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-medium rounded-full border border-teal-200">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {TYPE_LABELS[organizer.type] || organizer.type}
              </p>
              {organizer.website_url && (
                <a
                  href={organizer.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-coral-500 hover:text-coral-600 transition mt-1 inline-block"
                >
                  {organizer.website_url.replace(/^https?:\/\//, "")} ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900">
            Upcoming Events ({events.length})
          </h2>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No upcoming events from this organizer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                groupCount={event.group_count}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
