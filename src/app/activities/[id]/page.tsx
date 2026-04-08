"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import CommunityBadge from "@/components/CommunityBadge";
import GroupCard from "@/components/GroupCard";
import LockedCTA from "@/components/LockedCTA";
import ReportModal from "@/components/ReportModal";
import RequestJoinModal from "@/components/RequestJoinModal";
import type { Community, Event, Group, User } from "@/lib/types";

type ActivityGroupPreviewRow = Group & {
  host_display_name: string;
  host_avatar_url: string | null;
  community_name: string;
  community_type: Community["type"];
  member_count: number;
};

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [groups, setGroups] = useState<
    (Group & { host: User; member_count: number; community?: Community })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [joinGroupId, setJoinGroupId] = useState<string | null>(null);
  const [joinGroupTitle, setJoinGroupTitle] = useState("");
  const [joinRequestType, setJoinRequestType] = useState<
    "participant" | "social"
  >("participant");
  const [userCommunityIds, setUserCommunityIds] = useState<Set<string>>(
    new Set()
  );
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: memberships } = await supabase
          .from("community_memberships")
          .select("community_id")
          .eq("user_id", user.id);

        setUserCommunityIds(
          new Set((memberships || []).map((membership) => membership.community_id))
        );

        await supabase.from("event_interactions").insert({
          user_id: user.id,
          event_id: eventId,
          type: "view",
        });
      }

      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (!eventData) {
        setLoading(false);
        return;
      }

      setEvent(eventData as Event);

      const { data: groupData } = await supabase
        .from("activity_group_previews")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "active");

      const mapped = (groupData || []).map((raw) => {
        const row = raw as ActivityGroupPreviewRow;

        return {
          ...row,
          host: {
            id: row.host_user_id,
            display_name: row.host_display_name,
            avatar_url: row.host_avatar_url,
            bio: "",
            created_at: "",
          } satisfies User,
          community: {
            id: row.community_id,
            name: row.community_name,
            type: row.community_type,
            domain: null,
            allowed_email_domains: [],
            invite_code_hint: null,
            created_at: "",
          } satisfies Community,
        };
      });

      setGroups(
        mapped as (Group & {
          host: User;
          member_count: number;
          community?: Community;
        })[]
      );
      setLoading(false);
    }

    load();
  }, [eventId, supabase]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="space-y-5">
            <div className="h-[26rem] rounded-[36px] skeleton" />
            <div className="h-10 w-2/3 rounded-full skeleton" />
            <div className="h-5 w-1/2 rounded-full skeleton" />
          </div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-24 text-center text-coral-900/55">
          Activity not found
        </div>
      </>
    );
  }

  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-14 pt-6">
        <button
          onClick={() => router.push("/")}
          className="mb-5 flex w-fit items-center gap-2 rounded-full bg-coral-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-coral-600 hover:bg-coral-150"
        >
          <span>&larr;</span>
          Back to discover
        </button>

        <section className="relative overflow-hidden rounded-[38px]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#fff4f3] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-coral-900/15 to-teal-700/10" />
          <div className="relative h-[26rem] overflow-hidden rounded-[38px] md:h-[32rem]">
            {event.image_url ? (
              <Image
                src={event.image_url}
                alt={event.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#ffd3ce_0%,#fff4f3_46%,#dff8f7_100%)] text-7xl">
                🎯
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-teal-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">
                {event.category}
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600 backdrop-blur-sm">
                {groups.length} squads going
              </span>
            </div>
            <h1 className="display-font max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight text-coral-900 md:text-5xl">
              {event.title}
            </h1>
          </div>
        </section>

        <section className="-mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
          <div className="space-y-6">
            <div className="surface-card rounded-[34px] px-6 py-6 md:px-7">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoTile
                  label="Time"
                  value={startDate.toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                />
                <InfoTile
                  label="Distance"
                  value={
                    event.proximity_public_text ||
                    event.area_label ||
                    "Neighborhood only"
                  }
                />
                <InfoTile
                  label="Ends"
                  value={
                    endDate
                      ? endDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Flexible"
                  }
                />
              </div>

              <div className="mt-6 rounded-[28px] bg-coral-100 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral-900/45">
                  What you&apos;ll do
                </p>
                <p className="mt-3 text-base leading-7 text-coral-900/72">
                  {event.description}
                </p>
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-coral-900/65 shadow-[0_10px_18px_rgb(78,33,30,0.04)]"
                    >
                      {tag.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[32px] bg-coral-200/55 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/75 text-xl">
                  🔒
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral-900/45">
                    Privacy first
                  </p>
                  <p className="mt-2 text-sm leading-6 text-coral-900/72">
                    {event.proximity_public_text
                      ? `${event.proximity_public_text}.`
                      : "Neighborhood-level location only."} Exact meetup details
                    unlock after a host accepts you into a squad.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral-900/45">
                  Squad options
                </p>
                <h2 className="display-font mt-2 text-3xl font-extrabold text-coral-900">
                  Squads going
                </h2>
              </div>
              <button
                onClick={() => setShowReport(true)}
                className="rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-coral-900/55 shadow-[0_10px_20px_rgb(78,33,30,0.05)] hover:text-red-500"
              >
                Report
              </button>
            </div>

            {groups.map((group) => {
              const isCommunityMember = userCommunityIds.has(group.community_id);
              const isFull = group.member_count >= group.capacity;
              const canSocial = isFull && group.allow_social_after_full;
              const canWaitlist = isFull && group.waitlist_enabled;

              return (
                <div key={group.id} className="space-y-2">
                  {group.community && (
                    <CommunityBadge community={group.community} size="md" />
                  )}

                  <GroupCard
                    group={group}
                    host={group.host}
                    memberCount={group.member_count}
                    mutualCommunitiesCount={
                      userCommunityIds.has(group.community_id) ? 1 : 0
                    }
                  />

                  {isFull && (
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      <span className="rounded-full bg-coral-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-coral-600">
                        Full
                      </span>
                      {canSocial && (
                        <span className="rounded-full bg-teal-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
                          Social spots
                        </span>
                      )}
                      {canWaitlist && !canSocial && (
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                          Waitlist open
                        </span>
                      )}
                    </div>
                  )}

                  {isCommunityMember ? (
                    <div className="flex gap-2">
                      {!isFull && (
                        <ActionButton
                          label="Request to join"
                          onClick={() => {
                            setJoinGroupId(group.id);
                            setJoinGroupTitle(group.title);
                            setJoinRequestType("participant");
                          }}
                        />
                      )}

                      {isFull && canWaitlist && (
                        <ActionButton
                          label="Join waitlist"
                          variant="soft"
                          onClick={() => {
                            setJoinGroupId(group.id);
                            setJoinGroupTitle(group.title);
                            setJoinRequestType("participant");
                          }}
                        />
                      )}

                      {canSocial && (
                        <ActionButton
                          label="Join to socialize"
                          variant="teal"
                          onClick={() => {
                            setJoinGroupId(group.id);
                            setJoinGroupTitle(group.title);
                            setJoinRequestType("social");
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <LockedCTA
                      communityName={group.community?.name || "the community"}
                      onJoinCommunity={() => router.push("/profile/communities")}
                    />
                  )}
                </div>
              );
            })}

            <div className="surface-low rounded-[30px] px-6 py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-coral-600">
                +
              </div>
              <p className="display-font mt-4 text-xl font-bold text-coral-900">
                No squad fits?
              </p>
              <p className="mt-2 text-sm leading-6 text-coral-900/62">
                Create a new crew once custom squad creation is wired into this
                activity flow.
              </p>
            </div>
          </aside>
        </section>
      </main>

      {joinGroupId && (
        <RequestJoinModal
          groupId={joinGroupId}
          groupTitle={joinGroupTitle}
          requestType={joinRequestType}
          onClose={() => setJoinGroupId(null)}
          onSuccess={() => {
            setJoinGroupId(null);
            alert("Request sent! The host will review it.");
          }}
        />
      )}

      {showReport && (
        <ReportModal
          title="Activity"
          eventId={eventId}
          onClose={() => setShowReport(false)}
          onSuccess={() => {
            setShowReport(false);
            alert("Report submitted. Thank you.");
          }}
        />
      )}
    </>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-coral-50 px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-coral-900/45">
        {label}
      </p>
      <p className="mt-2 display-font text-lg font-bold text-coral-900">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  variant = "gradient",
}: {
  label: string;
  onClick: () => void;
  variant?: "gradient" | "teal" | "soft";
}) {
  const className =
    variant === "teal"
      ? "bg-teal-600 text-teal-200 shadow-[0_12px_28px_rgb(0,102,102,0.18)]"
      : variant === "soft"
        ? "bg-white text-coral-600 shadow-[0_10px_24px_rgb(78,33,30,0.06)]"
        : "gradient-cta text-white shadow-[0_12px_28px_rgb(160,58,15,0.18)]";

  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] hover:-translate-y-0.5 ${className}`}
    >
      {label}
    </button>
  );
}
