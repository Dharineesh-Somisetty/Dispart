"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import CategoryFilter from "@/components/CategoryFilter";
import EventCard from "@/components/EventCard";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import { createClient } from "@/lib/supabase/client";
import type { Event, UserPreferences } from "@/lib/types";

const TIME_FILTERS = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
];

const SKILL_FILTERS = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
];

const DISTANCE_OPTIONS = [
  { key: "5", label: "5 mi" },
  { key: "10", label: "10 mi" },
  { key: "25", label: "25 mi" },
  { key: "50", label: "50 mi" },
];

const SEARCH_CHIPS = [
  "Beginner Friendly",
  "Outdoors",
  "Volunteer",
  "Music",
  "Fitness",
];

const PAGE_SIZE = 18;
const SEATTLE_CENTER = { lat: 47.6062, lng: -122.3321 };

type EventWithMeta = Event & {
  group_count: number;
  recommendation_score: number;
  skill_level: "beginner" | "intermediate" | "advanced";
  estimated_distance_miles: number | null;
};

type PreferenceState = Pick<
  UserPreferences,
  | "include_categories"
  | "exclude_categories"
  | "hobby_allowlist"
  | "hobby_blocklist"
  | "max_distance_miles"
>;

export default function HomePage() {
  const supabase = createClient();
  const pageRef = useRef(0);

  const [category, setCategory] = useState("All Activities");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<string[]>([]);
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [distanceFilter, setDistanceFilter] = useState("10");
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(
    new Set()
  );
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<PreferenceState>({
    include_categories: [],
    exclude_categories: [],
    hobby_allowlist: [],
    hobby_blocklist: [],
    max_distance_miles: 10,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const selectedTime = timeFilter[0] ?? "";
  const selectedSkill = skillFilter[0] ?? "";
  const effectiveDistance = useMemo(
    () => Math.min(Number(distanceFilter), preferences.max_distance_miles || 10),
    [distanceFilter, preferences.max_distance_miles]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    async function loadUserSignals() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [savedRes, dismissedRes, blocksRes, preferencesRes] =
        await Promise.all([
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
          supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      setSavedEventIds(new Set((savedRes.data || []).map((row) => row.event_id)));
      setDismissedEventIds(
        new Set((dismissedRes.data || []).map((row) => row.event_id))
      );
      setBlockedUserIds(
        new Set((blocksRes.data || []).map((row) => row.blocked_user_id))
      );

      const prefs = preferencesRes.data as UserPreferences | null;
      if (prefs) {
        setPreferences({
          include_categories: prefs.include_categories || prefs.categories || [],
          exclude_categories: prefs.exclude_categories || [],
          hobby_allowlist: prefs.hobby_allowlist || prefs.tags || [],
          hobby_blocklist: prefs.hobby_blocklist || [],
          max_distance_miles: prefs.max_distance_miles || 10,
        });
        setDistanceFilter(String(prefs.max_distance_miles || 10));
      }
    }

    loadUserSignals();
  }, [supabase]);

  useEffect(() => {
    pageRef.current = 0;

    async function loadActivities() {
      setLoading(true);

      const rows = await fetchActivities({
        supabase,
        category,
        search: debouncedSearch,
        pageNum: 0,
        timeFilter: selectedTime,
      });

      const ranked = rankActivities(rows, {
        blockedUserIds,
        dismissedEventIds,
        effectiveDistance,
        preferences,
        selectedSkill,
      });

      setEvents(ranked);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    }

    loadActivities();
  }, [
    blockedUserIds,
    category,
    debouncedSearch,
    dismissedEventIds,
    effectiveDistance,
    preferences,
    selectedSkill,
    selectedTime,
    supabase,
  ]);

  async function loadMore() {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;

    const rows = await fetchActivities({
      supabase,
      category,
      search: debouncedSearch,
      pageNum: nextPage,
      timeFilter: selectedTime,
    });

    const ranked = rankActivities(rows, {
      blockedUserIds,
      dismissedEventIds,
      effectiveDistance,
      preferences,
      selectedSkill,
    });

    setEvents((current) => [...current, ...ranked]);
    setHasMore(rows.length === PAGE_SIZE);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        <section className="relative overflow-hidden rounded-[32px] bg-white px-6 py-8 shadow-sm ring-1 ring-black/5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-coral-100 via-white to-teal-100" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-coral-500">
                Recommended
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
                Find an activity that feels easy to say yes to.
              </h1>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                We’re ranking activities around your categories, hobbies, and
                distance preferences so your next squad invite feels personal.
              </p>
            </div>

            <div className="rounded-[24px] bg-gray-50 px-4 py-4 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Feed tuned to
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {preferences.include_categories.length > 0
                  ? preferences.include_categories.slice(0, 2).join(" • ")
                  : "Your latest activity signals"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Within {effectiveDistance} miles where we have distance data
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-[28px] bg-white px-5 py-5 shadow-sm ring-1 ring-black/5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Distance
            </span>
            <select
              aria-label="Distance filter"
              value={distanceFilter}
              onChange={(event) => setDistanceFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring-2 focus:ring-coral-300"
            >
              {DISTANCE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 lg:col-span-2">
            {SEARCH_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setSearch(chip)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  search.toLowerCase() === chip.toLowerCase()
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            <CategoryFilter selected={category} onChange={setCategory} />
          </div>

          <div className="flex flex-col gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Time
              </p>
              <FilterChips
                filters={TIME_FILTERS}
                selected={timeFilter}
                onChange={(selected) =>
                  setTimeFilter(selected.length ? [selected[selected.length - 1]] : [])
                }
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Skill level
              </p>
              <FilterChips
                filters={SKILL_FILTERS}
                selected={skillFilter}
                onChange={(selected) =>
                  setSkillFilter(
                    selected.length ? [selected[selected.length - 1]] : []
                  )
                }
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="rounded-[24px] bg-white shadow-sm ring-1 ring-black/5">
                  <div className="aspect-[4/3] skeleton rounded-t-[24px]" />
                  <div className="space-y-3 px-4 py-4">
                    <div className="h-3 w-24 rounded-full skeleton" />
                    <div className="h-5 w-2/3 rounded-full skeleton" />
                    <div className="h-4 w-1/2 rounded-full skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-[28px] bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-4xl">🎯</p>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Nothing matches this filter set yet
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Try widening your time window, unmuting a hobby, or increasing
                your distance radius.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recommended activities
                  </h2>
                  <p className="text-sm text-gray-500">
                    Sorted by your category and hobby matches first, then by time.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    groupCount={event.group_count}
                    saved={savedEventIds.has(event.id)}
                    onSave={(eventId) =>
                      setSavedEventIds((current) => new Set(current).add(eventId))
                    }
                    onDismiss={(eventId) =>
                      setDismissedEventIds(
                        (current) => new Set(current).add(eventId)
                      )
                    }
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="rounded-2xl border border-coral-200 px-5 py-3 text-sm font-semibold text-coral-600 transition hover:bg-coral-50 focus:outline-none focus:ring-2 focus:ring-coral-300"
                  >
                    Load more activities
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}

async function fetchActivities({
  supabase,
  category,
  search,
  pageNum,
  timeFilter,
}: {
  supabase: ReturnType<typeof createClient>;
  category: string;
  search: string;
  pageNum: number;
  timeFilter: string;
}): Promise<(Event & { group_count: number })[]> {
  let query = supabase
    .from("events")
    .select("*, groups(id)")
    .eq("status", "active")
    .order("start_time", { ascending: true })
    .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

  if (category !== "All Activities") {
    query = query.eq("category", category);
  }

  const now = new Date();
  if (timeFilter === "today") {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    query = query
      .gte("start_time", now.toISOString())
      .lte("start_time", endOfDay.toISOString());
  } else if (timeFilter === "this_week") {
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    query = query
      .gte("start_time", now.toISOString())
      .lte("start_time", endOfWeek.toISOString());
  } else if (timeFilter === "this_month") {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    query = query
      .gte("start_time", now.toISOString())
      .lte("start_time", endOfMonth.toISOString());
  }

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    const normalizedTag = normalizeTag(search.trim());
    query = query.or(
      `title.ilike.${term},venue_name.ilike.${term},description.ilike.${term},area_label.ilike.${term},tags.cs.{${normalizedTag}}`
    );
  }

  const { data } = await query;

  return ((data || []) as Array<Event & { groups?: unknown[] }>).map((event) => ({
    ...event,
    group_count: Array.isArray(event.groups) ? event.groups.length : 0,
  }));
}

function rankActivities(
  rows: (Event & { group_count: number })[],
  options: {
    blockedUserIds: Set<string>;
    dismissedEventIds: Set<string>;
    effectiveDistance: number;
    preferences: PreferenceState;
    selectedSkill: string;
  }
): EventWithMeta[] {
  const {
    blockedUserIds,
    dismissedEventIds,
    effectiveDistance,
    preferences,
    selectedSkill,
  } = options;

  return rows
    .map((event) => {
      const tags = (event.tags || []).map(normalizeTag);
      const estimatedDistance = estimateDistanceMiles(event);
      const skillLevel = inferSkillLevel(event);
      const sharedHobbies = tags.filter((tag) =>
        preferences.hobby_allowlist.map(normalizeTag).includes(tag)
      ).length;
      const categoryBoost = preferences.include_categories.includes(event.category)
        ? 4
        : 0;

      return {
        ...event,
        recommendation_score: categoryBoost + sharedHobbies * 2,
        skill_level: skillLevel,
        estimated_distance_miles: estimatedDistance,
      };
    })
    .filter((event) => !dismissedEventIds.has(event.id))
    .filter((event) => !blockedUserIds.has(event.creator_user_id))
    .filter(
      (event) => !preferences.exclude_categories.includes(event.category)
    )
    .filter((event) => {
      const blockedTags = preferences.hobby_blocklist.map(normalizeTag);
      return !event.tags.some((tag) => blockedTags.includes(normalizeTag(tag)));
    })
    .filter((event) =>
      selectedSkill ? event.skill_level === selectedSkill : true
    )
    .filter((event) =>
      event.estimated_distance_miles === null
        ? true
        : event.estimated_distance_miles <= effectiveDistance
    )
    .sort((left, right) => {
      if (right.recommendation_score !== left.recommendation_score) {
        return right.recommendation_score - left.recommendation_score;
      }

      return (
        new Date(left.start_time).getTime() - new Date(right.start_time).getTime()
      );
    });
}

function inferSkillLevel(event: Event): "beginner" | "intermediate" | "advanced" {
  const haystack = `${event.title} ${event.description} ${(event.tags || []).join(" ")}`
    .toLowerCase();

  if (
    haystack.includes("advanced") ||
    haystack.includes("experienced") ||
    haystack.includes("competitive")
  ) {
    return "advanced";
  }

  if (
    haystack.includes("intermediate") ||
    haystack.includes("trail run") ||
    haystack.includes("conversational pace")
  ) {
    return "intermediate";
  }

  return "beginner";
}

function estimateDistanceMiles(event: Event): number | null {
  if (event.lat === null || event.lng === null) {
    return null;
  }

  return haversineMiles(SEATTLE_CENTER, { lat: event.lat, lng: event.lng });
}

function haversineMiles(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(end.lat - start.lat);
  const dLng = toRadians(end.lng - start.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(start.lat)) *
      Math.cos(toRadians(end.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return Math.round(earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}
