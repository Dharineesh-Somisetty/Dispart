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
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [excludeCategories, setExcludeCategories] = useState<string[]>([]);
  const [hobbyAllowlist, setHobbyAllowlist] = useState<string[]>([]);
  const [hobbyBlocklist, setHobbyBlocklist] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(10);
  const [digestFrequency, setDigestFrequency] = useState<"off" | "daily" | "weekly">("off");
  const [emailOptIn, setEmailOptIn] = useState(true);

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
        setCategories(p.include_categories || p.categories || []);
        setExcludeCategories(p.exclude_categories || []);
        setHobbyAllowlist(p.hobby_allowlist || p.tags || []);
        setHobbyBlocklist(p.hobby_blocklist || []);
        setMaxDistance(p.max_distance_miles);
        setDigestFrequency(p.digest_frequency || "off");
        setEmailOptIn(p.email_opt_in ?? true);
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setExcludeCategories((prev) => prev.filter((c) => c !== cat));
  }

  function toggleExclude(cat: string) {
    setExcludeCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setCategories((prev) => prev.filter((c) => c !== cat));
  }

  function toggleHobby(hobby: string) {
    setHobbyAllowlist((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
    setHobbyBlocklist((prev) => prev.filter((h) => h !== hobby));
  }

  function toggleBlockedHobby(hobby: string) {
    setHobbyBlocklist((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
    setHobbyAllowlist((prev) => prev.filter((h) => h !== hobby));
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
      await supabase
        .from("user_preferences")
        .update(payload)
        .eq("user_id", user.id);
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
          Recommendation Settings
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Tell us what you enjoy so we can recommend the best activities for you.
        </p>

        <div className="space-y-6">
          {/* Favorite Categories */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">
              Include Categories
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Show me activities in these categories
            </p>
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

          {/* Exclude Categories */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">
              Mute Categories
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Hide activities from these categories
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleExclude(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    excludeCategories.includes(cat)
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Hobbies */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">
              Hobby Allowlist
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Prioritize activities matching your hobbies
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_HOBBIES.map((hobby) => (
                <button
                  key={hobby}
                  onClick={() => toggleHobby(hobby)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    hobbyAllowlist.includes(hobby)
                      ? "bg-teal-500 text-white border-teal-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {hobby}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">
              Hobby Mute List
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Hide activities centered around these hobbies
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_HOBBIES.map((hobby) => (
                <button
                  key={`${hobby}-blocked`}
                  onClick={() => toggleBlockedHobby(hobby)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    hobbyBlocklist.includes(hobby)
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {hobby}
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

          {/* Digest */}
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Email Digest
            </h2>
            <div className="flex gap-2 mb-4">
              {(["off", "daily", "weekly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setDigestFrequency(freq)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition capitalize ${
                    digestFrequency === freq
                      ? "bg-coral-500 text-white border-coral-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailOptIn}
                onChange={(e) => setEmailOptIn(e.target.checked)}
                className="rounded border-gray-300 text-coral-500 focus:ring-coral-400"
              />
              <span className="text-sm text-gray-700">
                Receive email notifications about recommended activities
              </span>
            </label>

            <p className="mt-3 text-xs text-gray-400">
              SMS is not enabled yet. We only store your email digest preference
              for now.
            </p>
          </div>

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
