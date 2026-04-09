"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
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
  { key: "details", label: "Identity" },
  { key: "time", label: "Timing" },
  { key: "location", label: "Privacy" },
  { key: "squad", label: "Squad" },
  { key: "publish", label: "Publish" },
];

export default function CreateActivityPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [meetupAreaLabel, setMeetupAreaLabel] = useState("");
  const [capacity, setCapacity] = useState(6);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [communityId, setCommunityId] = useState("");
  const [squadTitle, setSquadTitle] = useState("");
  const [squadDescription, setSquadDescription] = useState("");

  useEffect(() => {
    async function loadCommunities() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCommunities([]);
        setCommunityId("");
        return;
      }

      const { data: memberships, error: membershipsError } = await supabase
        .from("community_memberships")
        .select("community_id")
        .eq("user_id", user.id);

      if (membershipsError) {
        setCommunities([]);
        setCommunityId("");
        return;
      }

      const communityIds = (memberships || []).map(
        (membership) => membership.community_id
      );

      if (communityIds.length === 0) {
        setCommunities([]);
        setCommunityId("");
        return;
      }

      const { data: joinedCommunities } = await supabase
        .from("communities")
        .select("*")
        .in("id", communityIds)
        .order("name");

      const items = (joinedCommunities || []) as Community[];

      setCommunities(items);
      setCommunityId((currentCommunityId) => {
        if (items.length === 0) return "";
        return items.some((community) => community.id === currentCommunityId)
          ? currentCommunityId
          : items[0].id;
      });
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void loadCommunities();
      }
    }

    void loadCommunities();

    window.addEventListener("focus", loadCommunities);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", loadCommunities);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [supabase]);

  function canAdvance() {
    switch (step) {
      case 0:
        return Boolean(title && description && category);
      case 1:
        return Boolean(startTime);
      case 2:
        return Boolean(venueName);
      case 3:
        return Boolean(capacity > 0 && communityId);
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
      .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean);

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

    const { data: groupData, error: groupError } = await supabase
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

    await supabase.from("group_members").insert({
      group_id: groupData.id,
      user_id: user.id,
      role: "host",
    });

    router.push(`/activities/${eventData.id}`);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28 pt-6">
        <section className="relative overflow-hidden rounded-[36px] px-6 py-8 md:px-8">
          <div className="absolute inset-0 rounded-[36px] bg-[linear-gradient(135deg,#ffe2de_0%,#fff4f3_45%,#dff8f7_100%)]" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-coral-300/30 blur-3xl" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-600">
                  Create activity
                </p>
                <h1 className="display-font mt-3 text-4xl font-extrabold leading-tight text-coral-900">
                  Build your next masterpiece activity.
                </h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-coral-900/68">
                  Shape the vibe, set the privacy line, and give your future
                  squad something worth showing up for.
                </p>
              </div>
              <div className="hidden rounded-full bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-coral-900/55 shadow-[0_10px_24px_rgb(78,33,30,0.05)] md:block">
                Draft saved locally
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              {STEPS.map((item, index) => (
                <div key={item.key} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => index < step && setStep(index)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                        index <= step
                          ? "bg-coral-600 text-white shadow-[0_10px_24px_rgb(160,58,15,0.18)]"
                          : "bg-coral-250 text-coral-900/55"
                      }`}
                    >
                      {index + 1}
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-900/48">
                      {item.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="mt-[-1.5rem] h-[2px] flex-1 rounded-full bg-coral-250" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-card mt-6 rounded-[34px] px-6 py-6 md:px-8">
          {step === 0 && (
            <div className="space-y-6">
              <SectionIntro
                label="Step one"
                title="Define the vibe"
                description="Lead with the title, energy, and framing people need to know whether this is their kind of plan."
              />

              <Field label="Activity title">
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClassName}
                  placeholder="Sunset rooftop padel"
                />
              </Field>

              <Field label="Choose a vibe">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                        category === item
                          ? "bg-teal-600 text-teal-200"
                          : "bg-coral-100 text-coral-900/72 hover:bg-coral-200"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  className={`${inputClassName} min-h-36 resize-none`}
                  placeholder="What’s the plan? Keep it breezy, warm, and clear."
                />
              </Field>

              <Field label="Cover image URL">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className={inputClassName}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Tags">
                <input
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className={inputClassName}
                  placeholder="beginner-friendly, chill, creative"
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <SectionIntro
                label="Step two"
                title="Choose the timing"
                description="A clear start time makes it easy to join. Add an end time if the plan has a firm close."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Start time">
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className={inputClassName}
                  />
                </Field>

                <Field label="End time">
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <SectionIntro
                label="Step three"
                title="Set the privacy line"
                description="Keep the public listing broad and warm. Save the exact meetup details for accepted members."
              />

              <Field label="Venue or spot name">
                <input
                  type="text"
                  value={venueName}
                  onChange={(event) => setVenueName(event.target.value)}
                  className={inputClassName}
                  placeholder="The Mud Room"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Neighborhood">
                  <input
                    type="text"
                    value={areaLabel}
                    onChange={(event) => setAreaLabel(event.target.value)}
                    className={inputClassName}
                    placeholder="Capitol Hill"
                  />
                </Field>

                <Field label="Meetup area">
                  <input
                    type="text"
                    value={meetupAreaLabel}
                    onChange={(event) => setMeetupAreaLabel(event.target.value)}
                    className={inputClassName}
                    placeholder="Front entrance, lobby, trailhead"
                  />
                </Field>
              </div>

              <div className="rounded-[28px] bg-coral-100 px-5 py-5 text-sm leading-6 text-coral-900/68">
                Exact meetup details stay hidden until you accept someone into
                the squad.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <SectionIntro
                label="Step four"
                title="Shape the squad"
                description="Choose your community, set the capacity, and decide whether requests need approval."
              />

              <Field label="Community">
                {communities.length === 0 ? (
                  <div className="rounded-[26px] bg-coral-100 px-5 py-5 text-sm leading-6 text-coral-900/68">
                    You need a verified community before you can host.{" "}
                    <Link
                      href="/profile/communities"
                      className="font-semibold text-teal-700 underline"
                    >
                      Join one now
                    </Link>
                    .
                  </div>
                ) : (
                  <select
                    value={communityId}
                    onChange={(event) => setCommunityId(event.target.value)}
                    className={inputClassName}
                  >
                    {communities.map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Squad capacity">
                <div className="flex flex-wrap gap-2">
                  {[3, 4, 6, 8, 10, 15].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCapacity(value)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                        capacity === value
                          ? "bg-teal-600 text-teal-200"
                          : "bg-coral-100 text-coral-900/72 hover:bg-coral-200"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </Field>

              <label className="flex items-start gap-4 rounded-[28px] bg-coral-50 px-5 py-5">
                <input
                  type="checkbox"
                  checked={approvalRequired}
                  onChange={(event) => setApprovalRequired(event.target.checked)}
                  className="mt-1 rounded border-none text-teal-600"
                />
                <div>
                  <p className="display-font text-xl font-bold text-coral-900">
                    Approval required
                  </p>
                  <p className="mt-2 text-sm leading-6 text-coral-900/64">
                    Keep the exact meetup hidden and review each request before
                    people join your squad.
                  </p>
                </div>
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Squad name">
                  <input
                    type="text"
                    value={squadTitle}
                    onChange={(event) => setSquadTitle(event.target.value)}
                    className={inputClassName}
                    placeholder={`${title || "Activity"} Crew`}
                  />
                </Field>

                <Field label="Squad description">
                  <textarea
                    value={squadDescription}
                    onChange={(event) => setSquadDescription(event.target.value)}
                    rows={4}
                    className={`${inputClassName} resize-none`}
                    placeholder="Describe the mood of your crew."
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <SectionIntro
                label="Final step"
                title="Review the publish card"
                description="One last look before this goes live in the recommended feed."
              />

              <div className="rounded-[30px] bg-coral-50 px-6 py-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <SummaryRow label="Title" value={title || "Untitled"} />
                  <SummaryRow label="Category" value={category} />
                  <SummaryRow
                    label="When"
                    value={
                      startTime
                        ? new Date(startTime).toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "TBD"
                    }
                  />
                  <SummaryRow label="Venue" value={venueName || "TBD"} />
                  <SummaryRow
                    label="Squad size"
                    value={`${capacity} people`}
                  />
                  <SummaryRow
                    label="Approval"
                    value={approvalRequired ? "Required" : "Auto-accept"}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-[26px] bg-red-50 px-5 py-4 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="glass-nav fixed bottom-4 left-1/2 z-40 flex w-[min(860px,calc(100%-1rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-[28px] px-4 py-4 ambient-shadow">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : router.push("/"))}
            className="rounded-full px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-coral-600 hover:bg-coral-100"
          >
            {step > 0 ? "Back" : "Cancel"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="gradient-cta rounded-full px-7 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_30px_rgb(160,58,15,0.18)] disabled:opacity-50"
            >
              Next: {STEPS[step + 1].label}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="gradient-cta rounded-full px-7 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_30px_rgb(160,58,15,0.18)] disabled:opacity-50"
            >
              {loading ? "Publishing..." : "Publish activity"}
            </button>
          )}
        </footer>
      </main>
    </>
  );
}

function SectionIntro({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-900/45">
        {label}
      </p>
      <h2 className="display-font mt-3 text-3xl font-extrabold text-coral-900">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-coral-900/64">
        {description}
      </p>
    </header>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-coral-900/45">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-coral-900/45">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-coral-900">{value}</p>
    </div>
  );
}

const inputClassName =
  "w-full rounded-[26px] bg-coral-100 px-5 py-4 text-sm text-coral-900 placeholder:text-coral-900/45 outline-none";
