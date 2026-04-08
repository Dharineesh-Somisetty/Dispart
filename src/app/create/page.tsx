"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { Community } from "@/lib/types";

const CATEGORIES = [
  "Art & Creative",
  "Outdoors",
  "Food & Drink",
  "Workshops",
  "Fitness",
  "Music",
  "Sports",
  "Community",
  "Nightlife",
  "Other",
];

const STEPS = [
  { key: "details", label: "Details" },
  { key: "time", label: "Time" },
  { key: "location", label: "Location" },
  { key: "squad", label: "Squad" },
  { key: "publish", label: "Publish" },
];

export default function CreateActivityPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");

  // Step 2: Time
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Step 3: Location
  const [venueName, setVenueName] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [meetupAreaLabel, setMeetupAreaLabel] = useState("");

  // Step 4: Squad settings
  const [capacity, setCapacity] = useState(6);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [communityId, setCommunityId] = useState("");
  const [squadTitle, setSquadTitle] = useState("");
  const [squadDescription, setSquadDescription] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("community_memberships")
        .select("community_id, communities(*)")
        .eq("user_id", user.id);

      const comms = (memberships || [])
        .map((m) => (m as Record<string, unknown>).communities as Community)
        .filter(Boolean);

      setCommunities(comms);
      if (comms.length > 0) setCommunityId(comms[0].id);
    }

    load();
  }, [supabase]);

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return !!title && !!description && !!category;
      case 1:
        return !!startTime;
      case 2:
        return !!venueName;
      case 3:
        return capacity > 0 && !!communityId;
      default:
        return true;
    }
  }

  async function handlePublish() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean);

    // Create activity (event)
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        creator_user_id: user.id,
        title,
        description,
        mode: "DO",
        category,
        venue_name: venueName,
        area_label: areaLabel,
        proximity_public_text: areaLabel ? `Near ${areaLabel}` : "",
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
        image_url: imageUrl || null,
        tags: parsedTags,
        source: "community",
        status: "active",
      })
      .select()
      .single();

    if (eventError) {
      setError(eventError.message);
      setLoading(false);
      return;
    }

    // Create initial squad (group)
    const { error: groupError } = await supabase
      .from("groups")
      .insert({
        event_id: eventData.id,
        host_user_id: user.id,
        community_id: communityId,
        title: squadTitle || `${title} Crew`,
        description: squadDescription || `Squad for ${title}`,
        capacity,
        approval_required: approvalRequired,
        meetup_area_label: meetupAreaLabel || areaLabel || venueName,
        waitlist_enabled: true,
      })
      .select()
      .single();

    if (groupError) {
      setError(groupError.message);
      setLoading(false);
      return;
    }

    // Auto-join host as group member
    const { data: groupData } = await supabase
      .from("groups")
      .select("id")
      .eq("event_id", eventData.id)
      .eq("host_user_id", user.id)
      .single();

    if (groupData) {
      await supabase.from("group_members").insert({
        group_id: groupData.id,
        user_id: user.id,
        role: "host",
      });
    }

    router.push(`/activities/${eventData.id}`);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Create an Activity
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Host something fun — set the details, pick a spot, and let people join
          your squad.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={`w-full h-1.5 rounded-full transition ${
                  i <= step ? "bg-coral-500" : "bg-gray-200"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-medium">
          Step {step + 1}: {STEPS[step].label}
        </div>

        {/* Step 1: Details */}
        {step === 0 && (
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                placeholder="What are you doing?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 resize-none"
                placeholder="Tell people what to expect, what to bring, who it's for..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                      category === c
                        ? "bg-coral-500 text-white border-coral-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                placeholder="beginner-friendly, volunteer, outdoor"
              />
            </div>
          </div>
        )}

        {/* Step 2: Time */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
              />
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue / Spot Name *
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                placeholder="e.g., Greenlake Park, The Mud Room"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area / Neighborhood
              </label>
              <input
                type="text"
                value={areaLabel}
                onChange={(e) => setAreaLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                placeholder="e.g., Capitol Hill, Fremont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Squad Meetup Area
              </label>
              <input
                type="text"
                value={meetupAreaLabel}
                onChange={(e) => setMeetupAreaLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                placeholder="e.g., Front entrance, Parking lot B"
              />
              <p className="text-xs text-gray-400 mt-1">
                Exact location is shared only after accepting members
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Squad settings */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Community *
              </label>
              {communities.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
                  You need to join a community first.{" "}
                  <a
                    href="/profile/communities"
                    className="underline font-medium"
                  >
                    Join one now
                  </a>
                </div>
              ) : (
                <select
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Squad Capacity *
              </label>
              <div className="flex gap-2">
                {[3, 4, 6, 8, 10, 15].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setCapacity(n)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition ${
                      capacity === n
                        ? "bg-teal-500 text-white border-teal-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
                className="rounded border-gray-300 text-teal-500 focus:ring-teal-400"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Approval required
                </span>
                <p className="text-xs text-gray-400">
                  Review requests before people join your squad
                </p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Squad Name
              </label>
              <input
                type="text"
                value={squadTitle}
                onChange={(e) => setSquadTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                placeholder={`e.g., ${title || "Activity"} Crew`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Squad Description
              </label>
              <textarea
                value={squadDescription}
                onChange={(e) => setSquadDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 resize-none"
                placeholder="Describe the vibe of your squad..."
              />
            </div>
          </div>
        )}

        {/* Step 5: Review & Publish */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Review your activity</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Title</span>
                <span className="font-medium text-gray-900">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-900">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">When</span>
                <span className="font-medium text-gray-900">
                  {startTime
                    ? new Date(startTime).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Where</span>
                <span className="font-medium text-gray-900">{venueName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Squad size</span>
                <span className="font-medium text-gray-900">
                  {capacity} people
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Approval</span>
                <span className="font-medium text-gray-900">
                  {approvalRequired ? "Required" : "Auto-accept"}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex-1 py-3 rounded-xl bg-coral-500 text-white font-semibold hover:bg-coral-600 transition disabled:opacity-50"
            >
              Next: {STEPS[step + 1].label}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-coral-500 text-white font-semibold hover:bg-coral-600 transition disabled:opacity-50"
            >
              {loading ? "Publishing..." : "Publish Activity"}
            </button>
          )}
        </div>
      </main>
    </>
  );
}
