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
  "Volunteer",
  "Beginner Friendly",
  "Outdoors",
  "Late Night",
  "Creative",
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
  const [timeFilter, setTimeFilter] = useState<string[]>(["today"]);
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-14 pt-6">
        <section className="relative overflow-hidden rounded-[36px] px-6 py-8 md:px-8 md:py-10">
          <div className="absolute inset-0 rounded-[36px] bg-[linear-gradient(135deg,#ffe2de_0%,#fff4f3_45%,#dff8f7_100%)]" />
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-coral-300/35 blur-3xl" />
          <div className="absolute -bottom-16 left-8 h-48 w-48 rounded-full bg-teal-300/30 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-coral-600">
                Recommended For You
              </p>
              <h1 className="display-font max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight text-coral-900 md:text-5xl">
                A curated playground for things you actually want to do.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-coral-900/68">
                Discover activity plans with the polish of a magazine spread and
                the social ease of a group chat. Join a squad, keep exact meetup
                details private, and show up together.
              </p>
            </div>

            <div className="surface-card rounded-[30px] bg-white/70 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-coral-900/45">
                Feed tuned to
              </p>
              <p className="mt-3 display-font text-2xl font-bold text-coral-900">
                {preferences.include_categories.length > 0
                  ? preferences.include_categories.slice(0, 2).join(" • ")
                  : "Your latest signals"}
              </p>
              <p className="mt-2 text-sm leading-6 text-coral-900/62">
                Within {effectiveDistance} miles, filtered by your category and
                hobby preferences.
              </p>
            </div>
          </div>
        </section>

        <section className="surface-low ambient-shadow mt-6 rounded-[34px] p-4 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <SearchBar value={search} onChange={setSearch} />

            <div className="rounded-[26px] bg-coral-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="distance-filter"
                  className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral-900/55"
                >
                  Distance
                </label>
                <span className="display-font text-lg font-bold text-coral-600">
                  {effectiveDistance} mi
                </span>
              </div>
              <select
                id="distance-filter"
                aria-label="Distance filter"
                value={distanceFilter}
                onChange={(event) => setDistanceFilter(event.target.value)}
                className="mt-3 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-coral-900 outline-none"
              >
                {DISTANCE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {SEARCH_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setSearch(chip)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
                  search.toLowerCase() === chip.toLowerCase()
                    ? "bg-coral-600 text-white shadow-[0_10px_24px_rgb(160,58,15,0.16)]"
                    : "bg-white/80 text-coral-900/65 hover:bg-white"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-coral-900/45">
              Categories
            </p>
            <CategoryFilter selected={category} onChange={setCategory} />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-coral-900/45">
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
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-coral-900/45">
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

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-900/45">
                Curated feed
              </p>
              <h2 className="display-font mt-2 text-3xl font-extrabold text-coral-900">
                Recommended activities
              </h2>
            </div>
            <p className="max-w-sm text-right text-sm leading-6 text-coral-900/58">
              Sorted by category fit, hobby overlap, and what feels timely right
              now.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className={`overflow-hidden rounded-[32px] ${item % 3 === 1 ? "xl:translate-y-6" : ""}`}
                >
                  <div className="surface-card rounded-[32px]">
                    <div className="aspect-[4/3] skeleton" />
                    <div className="space-y-3 px-5 py-5">
                      <div className="h-3 w-24 rounded-full skeleton" />
                      <div className="h-7 w-2/3 rounded-full skeleton" />
                      <div className="h-4 w-1/2 rounded-full skeleton" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="surface-card rounded-[34px] px-6 py-16 text-center">
              <p className="text-5xl">🎯</p>
              <h3 className="display-font mt-5 text-3xl font-extrabold text-coral-900">
                Nothing matches this mix yet
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-coral-900/58">
                Try widening the radius, switching the time horizon, or turning
                off a mute list for a broader set of invitations.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className={index % 3 === 1 ? "xl:translate-y-6" : ""}
                  >
                    <EventCard
                      event={event}
                      groupCount={event.group_count}
                      priority={index < 2}
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
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="gradient-cta rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_28px_rgb(160,58,15,0.2)] hover:-translate-y-0.5"
                  >
                    Load more
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

  return Math.round(
    earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}
