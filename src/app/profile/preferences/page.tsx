"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/lib/types";

const CATEGORIES = [
  "Music",
  "Art & Creative",
  "Food & Drink",
  "Outdoors",
  "Sports",
  "Workshops",
  "Community",
  "Nightlife",
  "Fitness",
];

const POPULAR_HOBBIES = [
  "hiking",
  "pottery",
  "volleyball",
  "cooking",
  "yoga",
  "photography",
  "gardening",
  "running",
  "cycling",
  "painting",
  "climbing",
  "dance",
  "cricket",
  "kayaking",
  "volunteer",
];

const DISTANCES = [5, 10, 25, 50, 100];

export default function PreferencesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [excludeCategories, setExcludeCategories] = useState<string[]>([]);
  const [hobbyAllowlist, setHobbyAllowlist] = useState<string[]>([]);
  const [hobbyBlocklist, setHobbyBlocklist] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(10);
  const [digestFrequency, setDigestFrequency] = useState<
    "off" | "daily" | "weekly"
  >("off");
  const [emailOptIn, setEmailOptIn] = useState(true);

  useEffect(() => {
    async function loadPreferences() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const value = data as UserPreferences;
        setPrefs(value);
        setCategories(value.include_categories || value.categories || []);
        setExcludeCategories(value.exclude_categories || []);
        setHobbyAllowlist(value.hobby_allowlist || value.tags || []);
        setHobbyBlocklist(value.hobby_blocklist || []);
        setMaxDistance(value.max_distance_miles);
        setDigestFrequency(value.digest_frequency || "off");
        setEmailOptIn(value.email_opt_in ?? true);
      }

      setLoading(false);
    }

    loadPreferences();
  }, [supabase]);

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
    setExcludeCategories((current) =>
      current.filter((item) => item !== category)
    );
  }

  function toggleExcludeCategory(category: string) {
    setExcludeCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
    setCategories((current) => current.filter((item) => item !== category));
  }

  function toggleHobby(hobby: string) {
    setHobbyAllowlist((current) =>
      current.includes(hobby)
        ? current.filter((item) => item !== hobby)
        : [...current, hobby]
    );
    setHobbyBlocklist((current) => current.filter((item) => item !== hobby));
  }

  function toggleBlockedHobby(hobby: string) {
    setHobbyBlocklist((current) =>
      current.includes(hobby)
        ? current.filter((item) => item !== hobby)
        : [...current, hobby]
    );
    setHobbyAllowlist((current) => current.filter((item) => item !== hobby));
  }

  async function handleSave() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      max_distance_miles: maxDistance,
      include_categories: categories,
      exclude_categories: excludeCategories,
      hobby_allowlist: hobbyAllowlist,
      hobby_blocklist: hobbyBlocklist,
      digest_frequency: digestFrequency,
      email_opt_in: emailOptIn,
      sms_opt_in: false,
      categories,
      tags: hobbyAllowlist,
    };

    if (prefs) {
      await supabase.from("user_preferences").update(payload).eq("user_id", user.id);
    } else {
      await supabase.from("user_preferences").insert(payload);
    }

    setSaving(false);
    router.push("/profile");
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="space-y-5">
            <div className="h-36 rounded-[34px] skeleton" />
            <div className="h-32 rounded-[28px] skeleton" />
            <div className="h-32 rounded-[28px] skeleton" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-14 pt-6">
        <section className="surface-card rounded-[36px] px-6 py-8 md:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-600">
            Discovery engine
          </p>
          <h1 className="display-font mt-3 text-4xl font-extrabold leading-tight text-coral-900">
            Personalize the activity feed.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-coral-900/62">
            Choose what to pull closer, what to mute, and how often Dispart
            should nudge you with new ideas.
          </p>
        </section>

        <div className="mt-6 space-y-6">
          <PreferenceCard
            label="Categories to include"
            description="Give extra weight to the kinds of plans you usually say yes to."
          >
            <ChipGrid
              items={CATEGORIES}
              activeItems={categories}
              onToggle={toggleCategory}
              activeClassName="bg-teal-600 text-teal-200"
            />
          </PreferenceCard>

          <PreferenceCard
            label="Categories to mute"
            description="Turn down the noise from activity lanes that aren’t for you right now."
          >
            <ChipGrid
              items={CATEGORIES}
              activeItems={excludeCategories}
              onToggle={toggleExcludeCategory}
              activeClassName="bg-coral-600 text-white"
            />
          </PreferenceCard>

          <PreferenceCard
            label="Hobby allowlist"
            description="Boost plans that match your hobbies and favorite subcultures."
          >
            <ChipGrid
              items={POPULAR_HOBBIES}
              activeItems={hobbyAllowlist}
              onToggle={toggleHobby}
              activeClassName="bg-teal-600 text-teal-200"
            />
          </PreferenceCard>

          <PreferenceCard
            label="Hobby mute list"
            description="Hide activities centered on hobbies you don’t want in the feed."
          >
            <ChipGrid
              items={POPULAR_HOBBIES}
              activeItems={hobbyBlocklist}
              onToggle={toggleBlockedHobby}
              activeClassName="bg-coral-600 text-white"
            />
          </PreferenceCard>

          <PreferenceCard
            label="Search radius"
            description="Choose how far the feed should reach when we can estimate location."
          >
            <div className="grid gap-3 sm:grid-cols-5">
              {DISTANCES.map((distance) => (
                <button
                  key={distance}
                  type="button"
                  onClick={() => setMaxDistance(distance)}
                  className={`rounded-full px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] ${
                    maxDistance === distance
                      ? "bg-coral-600 text-white"
                      : "bg-coral-100 text-coral-900/72 hover:bg-coral-200"
                  }`}
                >
                  {distance} mi
                </button>
              ))}
            </div>
          </PreferenceCard>

          <PreferenceCard
            label="Digest rhythm"
            description="Email only for now. SMS remains stored as off until that channel is live."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(["off", "daily", "weekly"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDigestFrequency(value)}
                  className={`rounded-full px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] ${
                    digestFrequency === value
                      ? "bg-teal-600 text-teal-200"
                      : "bg-coral-100 text-coral-900/72 hover:bg-coral-200"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <label className="mt-5 flex items-start gap-4 rounded-[26px] bg-coral-50 px-5 py-5">
              <input
                type="checkbox"
                checked={emailOptIn}
                onChange={(event) => setEmailOptIn(event.target.checked)}
                className="mt-1 rounded border-none text-teal-600"
              />
              <div>
                <p className="display-font text-xl font-bold text-coral-900">
                  Email digest enabled
                </p>
                <p className="mt-2 text-sm leading-6 text-coral-900/64">
                  Receive curated recommendations based on your current settings.
                </p>
              </div>
            </label>
          </PreferenceCard>
        </div>

        <div className="glass-nav sticky bottom-4 mt-8 flex justify-end rounded-[28px] px-4 py-4 ambient-shadow">
          <button
            onClick={handleSave}
            disabled={saving}
            className="gradient-cta rounded-full px-7 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_30px_rgb(160,58,15,0.18)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </main>
    </>
  );
}

function PreferenceCard({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card rounded-[32px] px-6 py-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-900/42">
        {label}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-coral-900/62">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ChipGrid({
  items,
  activeItems,
  onToggle,
  activeClassName,
}: {
  items: string[];
  activeItems: string[];
  onToggle: (value: string) => void;
  activeClassName: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onToggle(item)}
          className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
            activeItems.includes(item)
              ? activeClassName
              : "bg-coral-100 text-coral-900/72 hover:bg-coral-200"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
