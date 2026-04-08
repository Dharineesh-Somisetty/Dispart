"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { Event, Group } from "@/lib/types";

interface ScheduleItem {
  group: Group;
  event: Event;
  role: "host" | "member";
}

function getSection(startTime: string): string {
  const date = new Date(startTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

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
  const supabase = createClient();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedule() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

      const { data: memberships } = await supabase
        .from("group_members")
        .select("role, groups(*, events(*))")
        .eq("user_id", user.id);

      const nextItems: ScheduleItem[] = [];

      for (const membership of memberships || []) {
        const group = (membership as Record<string, unknown>).groups as Group & {
          events: Event;
        };

        if (!group || !group.events) continue;
        if (group.status !== "active") continue;
        if (group.events.start_time < cutoff) continue;

        nextItems.push({
          group,
          event: group.events,
          role: membership.role as "host" | "member",
        });
      }

      nextItems.sort(
        (left, right) =>
          new Date(left.event.start_time).getTime() -
          new Date(right.event.start_time).getTime()
      );

      setItems(nextItems);
      setLoading(false);
    }

    loadSchedule();
  }, [supabase]);

  const sections = ["Today", "This Week", "This Weekend", "Later"];
  const grouped = new Map<string, ScheduleItem[]>();
  for (const section of sections) grouped.set(section, []);
  for (const item of items) {
    const section = getSection(item.event.start_time);
    grouped.get(section)?.push(item);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-14 pt-6">
        <section className="surface-card rounded-[34px] px-6 py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-600">
            My squads
          </p>
          <h1 className="display-font mt-3 text-4xl font-extrabold leading-tight text-coral-900">
            Your schedule, styled like a social itinerary.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-coral-900/62">
            Keep your upcoming activity plans, check-in moments, and squad links
            in one clean timeline.
          </p>
        </section>

        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 rounded-[28px] skeleton" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="surface-card mt-6 rounded-[34px] px-6 py-16 text-center">
            <p className="text-5xl">📅</p>
            <h2 className="display-font mt-5 text-3xl font-extrabold text-coral-900">
              No upcoming plans yet
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-coral-900/58">
              Join a squad from the recommended feed and your next plan will
              land here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {sections.map((section) => {
              const sectionItems = grouped.get(section) || [];
              if (sectionItems.length === 0) return null;

              return (
                <section key={section}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-full bg-coral-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">
                      {section}
                    </span>
                  </div>

                  <div className="grid gap-4">
                    {sectionItems.map((item) => {
                      const date = new Date(item.event.start_time);

                      return (
                        <Link
                          key={item.group.id}
                          href={`/groups/${item.group.id}`}
                          className="surface-card rounded-[30px] px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgb(78,33,30,0.08)]"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-center">
                            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[24px] bg-coral-100">
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">
                                {date.toLocaleDateString("en-US", {
                                  month: "short",
                                })}
                              </span>
                              <span className="display-font text-2xl font-extrabold text-coral-900">
                                {date.getDate()}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="display-font text-2xl font-bold text-coral-900">
                                  {item.event.title}
                                </h3>
                                {item.role === "host" && (
                                  <span className="rounded-full bg-teal-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
                                    Host
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-sm font-semibold text-coral-900/68">
                                {item.group.title} •{" "}
                                {date.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="mt-1 text-sm text-coral-900/55">
                                {item.group.meetup_area_label || item.event.area_label}
                              </p>
                            </div>

                            <button
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                window.location.href = `/api/ics/${item.group.id}`;
                              }}
                              className="rounded-full bg-coral-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-coral-600 hover:bg-coral-100"
                            >
                              Add to calendar
                            </button>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
