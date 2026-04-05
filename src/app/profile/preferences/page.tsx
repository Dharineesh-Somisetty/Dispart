"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { UserPreferences } from "@/lib/types";

const CATEGORIES = [
  "Music",
  "Art & Creative",
  "Food & Drink",
  "Outdoors",
  "Sports",
  "Tech",
  "Community",
  "Nightlife",
  "Wellness",
];

const POPULAR_TAGS = [
  "live-music",
  "hiking",
  "volunteer",
  "networking",
  "beginner",
  "food",
  "creative",
  "wellness",
  "nightlife",
  "free",
  "outdoor",
  "workshop",
];

const DISTANCES = [5, 10, 25, 50, 100];

export default function PreferencesPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [modePreference, setModePreference] = useState<"ALL" | "WATCH" | "DO">(
    "ALL"
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(10);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
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
        const p = data as UserPreferences;
        setPrefs(p);
        setModePreference(p.mode_preference);
        setCategories(p.categories);
        setTags(p.tags);
        setMaxDistance(p.max_distance_miles);
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      mode_preference: modePreference,
      categories,
      tags,
      max_distance_miles: maxDistance,
    };

    if (prefs) {
      await supabase
        .from("user_preferences")
        .update(payload)
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_preferences").insert(payload);
    }

    setSaving(false);
    router.push("/");
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-xl mx-auto p-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Your Preferences
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Help us show you the most relevant events. These preferences improve
          your recommendations.
        </p>

        <div className="space-y-6">
          {/* Mode preference */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Default Mode
            </h2>
            <div className="flex gap-2">
              {(["ALL", "WATCH", "DO"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModePreference(m)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                    modePreference === m
                      ? m === "WATCH"
                        ? "bg-gray-900 text-white border-gray-900"
                        : m === "DO"
                          ? "bg-teal-500 text-white border-teal-500"
                          : "bg-coral-500 text-white border-coral-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {m === "ALL" ? "All" : m === "WATCH" ? "🎭 Watch" : "🎯 Do"}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Favorite Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    categories.includes(cat)
                      ? "bg-coral-500 text-white border-coral-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Interests
            </h2>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    tags.includes(tag)
                      ? "bg-teal-500 text-white border-teal-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Max Distance
            </h2>
            <div className="flex gap-2">
              {DISTANCES.map((d) => (
                <button
                  key={d}
                  onClick={() => setMaxDistance(d)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition ${
                    maxDistance === d
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {d} mi
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-coral-500 text-white font-semibold hover:bg-coral-600 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </main>
    </>
  );
}
