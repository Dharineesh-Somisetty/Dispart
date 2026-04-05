"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { Group, Event } from "@/lib/types";

interface ScheduleItem {
  group: Group;
  event: Event;
  role: "host" | "member";
}

function getSection(startTime: string): string {
  const d = new Date(startTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.floor(
    (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) return "Today";

  const dayOfWeek = now.getDay();
  const daysToSaturday = 6 - dayOfWeek;
  const daysToSunday = 7 - dayOfWeek;

  if (diffDays <= daysToSunday) {
    if (diffDays >= daysToSaturday) return "This Weekend";
    return "This Week";
  }

  return "Later";
}

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

      const { data: memberships } = await supabase
        .from("group_members")
        .select("role, groups(*, events(*))")
        .eq("user_id", user.id);

      const schedule: ScheduleItem[] = [];

      for (const m of memberships || []) {
        const g = (m as Record<string, unknown>).groups as Group & {
          events: Event;
        };
        if (!g || !g.events) continue;
        if (g.status !== "active") continue;
        if (g.events.start_time < cutoff) continue;

        schedule.push({
          group: g,
          event: g.events,
          role: m.role as "host" | "member",
        });
      }

      schedule.sort(
        (a, b) =>
          new Date(a.event.start_time).getTime() -
          new Date(b.event.start_time).getTime()
      );

      setItems(schedule);
      setLoading(false);
    }

    load();
  }, [supabase]);

  const sections = ["Today", "This Week", "This Weekend", "Later"];
  const grouped = new Map<string, ScheduleItem[]>();
  for (const s of sections) grouped.set(s, []);
  for (const item of items) {
    const section = getSection(item.event.start_time);
    grouped.get(section)?.push(item);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Schedule</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your upcoming squads and plans
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-lg">No upcoming plans</p>
            <p className="text-sm mt-1">
              Join a squad from the Discover page to get started
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => {
              const sectionItems = grouped.get(section) || [];
              if (sectionItems.length === 0) return null;

              return (
                <div key={section}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {section}
                  </h2>
                  <div className="space-y-3">
                    {sectionItems.map((item) => {
                      const d = new Date(item.event.start_time);
                      return (
                        <a
                          key={item.group.id}
                          href={`/groups/${item.group.id}`}
                          className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition"
                        >
                          <div className="flex items-start gap-4">
                            {/* Date badge */}
                            <div className="shrink-0 w-12 h-12 rounded-xl bg-coral-50 flex flex-col items-center justify-center">
                              <span className="text-[10px] font-medium text-coral-500 uppercase">
                                {d.toLocaleDateString("en-US", {
                                  month: "short",
                                })}
                              </span>
                              <span className="text-lg font-bold text-coral-600 leading-none">
                                {d.getDate()}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">
                                  {item.event.title}
                                </h3>
                                {item.role === "host" && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-600 font-medium rounded-full">
                                    Host
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {item.group.title} &middot;{" "}
                                {d.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                📍 {item.group.meetup_area_label || item.event.area_label}
                              </p>
                            </div>

                            {/* ICS download */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/api/ics/${item.group.id}`;
                              }}
                              className="shrink-0 w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                              title="Add to Calendar"
                            >
                              📅
                            </button>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
