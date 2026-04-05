"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import ToggleSwitch from "@/components/ToggleSwitch";
import CategoryFilter from "@/components/CategoryFilter";
import EventCard from "@/components/EventCard";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import type { Event, Organizer } from "@/lib/types";

const QUICK_FILTERS = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "this_weekend", label: "This Weekend" },
  { key: "free", label: "Free" },
  { key: "ticketed", label: "Ticketed" },
];

const SEARCH_CHIPS = [
  "Volunteer",
  "Networking",
  "Live Music",
  "Beginner Friendly",
  "Free Tonight",
];

const PAGE_SIZE = 12;

type EventWithMeta = Event & {
  group_count: number;
  organizer?: Organizer | null;
};

export default function HomePage() {
  const [mode, setMode] = useState<"WATCH" | "DO" | "ALL">("ALL");
  const [category, setCategory] = useState("All Events");
  const [search, setSearch] = useState("");
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(
    new Set()
  );
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const pageRef = useRef(0);

  const supabase = createClient();

  // Load user's saved/dismissed events and blocked users
  useEffect(() => {
    async function loadUserSignals() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [savedRes, dismissedRes, blocksRes] = await Promise.all([
        supabase
          .from("event_interactions")
          .select("event_id")
          .eq("user_id", user.id)
          .eq("type", "save"),
        supabase
          .from("event_interactions")
          .select("event_id")
          .eq("user_id", user.id)
          .eq("type", "dismiss"),
        supabase
          .from("blocks")
          .select("blocked_user_id")
          .eq("blocker_user_id", user.id),
      ]);

      setSavedEventIds(
        new Set((savedRes.data || []).map((r) => r.event_id))
      );
      setDismissedEventIds(
        new Set((dismissedRes.data || []).map((r) => r.event_id))
      );
      setBlockedUserIds(
        new Set((blocksRes.data || []).map((r) => r.blocked_user_id))
      );
    }

    loadUserSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset and load on filter change
  useEffect(() => {
    pageRef.current = 0;

    const controller = new AbortController();

    (async () => {
      setLoading(true);

      const result = await fetchEvents(
        supabase,
        mode,
        category,
        quickFilters,
        debouncedSearch,
        0
      );

      if (controller.signal.aborted) return;

      // Client-side filtering: remove dismissed events and blocked hosts
      const filtered = result.filter(
        (e) =>
          !dismissedEventIds.has(e.id) && !blockedUserIds.has(e.creator_user_id)
      );

      setEvents(filtered);
      setHasMore(result.length === PAGE_SIZE);
      setLoading(false);
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, category, quickFilters, debouncedSearch, dismissedEventIds, blockedUserIds]);

  async function loadMore() {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;

    const result = await fetchEvents(
      supabase,
      mode,
      category,
      quickFilters,
      debouncedSearch,
      nextPage
    );

    const filtered = result.filter(
      (e) =>
        !dismissedEventIds.has(e.id) && !blockedUserIds.has(e.creator_user_id)
    );

    setEvents((prev) => [...prev, ...filtered]);
    setHasMore(result.length === PAGE_SIZE);
  }

  const handleSave = useCallback((eventId: string) => {
    setSavedEventIds((prev) => new Set(prev).add(eventId));
  }, []);

  const handleDismiss = useCallback((eventId: string) => {
    setDismissedEventIds((prev) => new Set(prev).add(eventId));
  }, []);

  function handleChipClick(chip: string) {
    setSearch(chip.toLowerCase());
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Toggle */}
        <div className="flex justify-center mb-5">
          <ToggleSwitch value={mode} onChange={setMode} />
        </div>

        {/* Search */}
        <div className="mb-3">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* Search chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                search.toLowerCase() === chip.toLowerCase()
                  ? "bg-coral-500 text-white border-coral-500"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Quick filters */}
        <div className="mb-4">
          <FilterChips
            filters={QUICK_FILTERS}
            selected={quickFilters}
            onChange={setQuickFilters}
          />
        </div>

        {/* Category filters */}
        <div className="mb-6">
          <CategoryFilter selected={category} onChange={setCategory} />
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-72 animate-pulse"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No events found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  groupCount={event.group_count}
                  organizer={event.organizer}
                  saved={savedEventIds.has(event.id)}
                  onSave={handleSave}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  className="px-6 py-2.5 text-sm font-medium text-coral-500 border border-coral-200 rounded-xl hover:bg-coral-50 transition"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

async function fetchEvents(
  supabase: ReturnType<typeof createClient>,
  mode: string,
  category: string,
  quickFilters: string[],
  search: string,
  pageNum: number
): Promise<EventWithMeta[]> {
  let query = supabase
    .from("events")
    .select("*, groups(id), organizers(*)")
    .eq("status", "active")
    .order("start_time", { ascending: true })
    .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

  if (mode !== "ALL") {
    query = query.eq("mode", mode);
  }

  if (category !== "All Events") {
    query = query.eq("category", category);
  }

  if (quickFilters.includes("free")) {
    query = query.eq("is_ticketed", false);
  }
  if (quickFilters.includes("ticketed")) {
    query = query.eq("is_ticketed", true);
  }

  const now = new Date();
  if (quickFilters.includes("today")) {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    query = query
      .gte("start_time", now.toISOString())
      .lte("start_time", endOfDay.toISOString());
  } else if (quickFilters.includes("this_week")) {
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    query = query
      .gte("start_time", now.toISOString())
      .lte("start_time", endOfWeek.toISOString());
  } else if (quickFilters.includes("this_weekend")) {
    const dayOfWeek = now.getDay();
    const daysToSaturday = dayOfWeek <= 6 ? 6 - dayOfWeek : 0;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysToSaturday);
    saturday.setHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    query = query
      .gte("start_time", saturday.toISOString())
      .lte("start_time", sunday.toISOString());
  }

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    // Search title, venue, area, description AND tags
    query = query.or(
      `title.ilike.${term},venue_name.ilike.${term},description.ilike.${term},area_label.ilike.${term},tags.cs.{${search.trim().toLowerCase().replace(/\s+/g, "-")}}`
    );
  }

  const { data } = await query;

  return (data || []).map((e) => {
    const rec = e as Record<string, unknown>;
    return {
      ...e,
      organizer: rec.organizers as Organizer | null,
      organizers: undefined,
      groups: undefined,
      group_count: Array.isArray(rec.groups)
        ? (rec.groups as unknown[]).length
        : 0,
    };
  }) as EventWithMeta[];
}
