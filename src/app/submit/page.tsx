"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

const ORGANIZER_TYPES = [
  { key: "company", label: "Company" },
  { key: "musician", label: "Musician / Band" },
  { key: "venue", label: "Venue" },
  { key: "nonprofit", label: "Nonprofit" },
  { key: "community", label: "Community Org" },
  { key: "individual", label: "Individual" },
] as const;

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
  "Other",
];

const MODES = [
  { key: "WATCH", label: "Watch (spectate)", emoji: "🎭" },
  { key: "DO", label: "Do (participate)", emoji: "🎯" },
] as const;

export default function SubmitEventPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Organizer fields
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");

  // Event fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"WATCH" | "DO">("DO");
  const [category, setCategory] = useState("Other");
  const [venueName, setVenueName] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    // Create organizer
    const { data: orgData, error: orgError } = await supabase
      .from("organizers")
      .insert({
        name: orgName,
        type: orgType,
        verified: false,
        website_url: orgWebsite || null,
        created_by_user_id: user.id,
      })
      .select()
      .single();

    if (orgError) {
      setError(orgError.message);
      setLoading(false);
      return;
    }

    // Parse tags
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean);

    // Create event
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        creator_user_id: user.id,
        organizer_id: orgData.id,
        source: "organizer",
        title,
        description,
        mode,
        category,
        venue_name: venueName,
        area_label: areaLabel,
        proximity_public_text: areaLabel ? `Near ${areaLabel}` : "",
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
        ticket_url: ticketUrl || null,
        external_url: externalUrl || null,
        price_display: priceDisplay || null,
        is_ticketed: !!ticketUrl,
        image_url: imageUrl || null,
        tags: parsedTags,
      })
      .select()
      .single();

    if (eventError) {
      setError(eventError.message);
      setLoading(false);
      return;
    }

    router.push(`/events/${eventData.id}`);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Submit an Event
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Share your event with the Dispart community. Organizer accounts start
          unverified and can be verified by admins.
        </p>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 mb-2">
                About the Organizer
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organizer Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                  placeholder="Your org name or your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organizer Type *
                </label>
                <div className="flex flex-wrap gap-2">
                  {ORGANIZER_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.key}
                      onClick={() => setOrgType(t.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                        orgType === t.key
                          ? "bg-coral-500 text-white border-coral-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {(orgType === "nonprofit" || orgType === "venue" || orgType === "company") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                    placeholder="https://your-org.com"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!orgName || !orgType}
                className="w-full py-3 rounded-xl bg-coral-500 text-white font-semibold hover:bg-coral-600 transition disabled:opacity-50"
              >
                Next: Event Details
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-gray-900">Event Details</h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  &larr; Back
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                  placeholder="What's the event called?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 resize-none"
                  placeholder="Tell people about the event..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode *
                </label>
                <div className="flex gap-2">
                  {MODES.map((m) => (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => setMode(m.key)}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                        mode === m.key
                          ? m.key === "WATCH"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-teal-500 text-white border-teal-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                    placeholder="Venue name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area
                  </label>
                  <input
                    type="text"
                    value={areaLabel}
                    onChange={(e) => setAreaLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                    placeholder="e.g. Capitol Hill"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ticket URL
                  </label>
                  <input
                    type="url"
                    value={ticketUrl}
                    onChange={(e) => setTicketUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                    placeholder="https://tickets..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details URL
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                    placeholder="https://event-page..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Display
                  </label>
                  <input
                    type="text"
                    value={priceDisplay}
                    onChange={(e) => setPriceDisplay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                    placeholder='e.g. "Free" or "From $25"'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
                    placeholder="https://..."
                  />
                </div>
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
                  placeholder="volunteer, networking, beginner-friendly"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={
                  loading || !title || !description || !venueName || !startTime
                }
                className="w-full py-3 rounded-xl bg-coral-500 text-white font-semibold hover:bg-coral-600 transition disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Event"}
              </button>
            </div>
          )}
        </form>
      </main>
    </>
  );
}
