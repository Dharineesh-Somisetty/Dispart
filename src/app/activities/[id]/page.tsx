"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import GroupCard from "@/components/GroupCard";
import RequestJoinModal from "@/components/RequestJoinModal";
import LockedCTA from "@/components/LockedCTA";
import CommunityBadge from "@/components/CommunityBadge";
import ReportModal from "@/components/ReportModal";
import type { Event, Group, User, Community } from "@/lib/types";

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

  const supabase = createClient();

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
          new Set((memberships || []).map((m) => m.community_id))
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

      setEvent(eventData as unknown as Event);

      const { data: groupsData } = await supabase
        .from("activity_group_previews")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "active");

      const mapped = (groupsData || []).map((g) => {
        const row = g as ActivityGroupPreviewRow;

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
        <div className="max-w-6xl mx-auto p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto p-4 text-center py-20 text-gray-400">
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
      <main className="max-w-6xl mx-auto w-full px-4 py-6">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          <span>&larr;</span> Back to Discover
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Activity details */}
          <div className="lg:col-span-3">
            <div className="relative aspect-video bg-gray-200 rounded-2xl overflow-hidden mb-6">
              {event.image_url ? (
                <Image
                  src={event.image_url}
                  alt={event.title}
                  fill
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-coral-200 to-teal-200 flex items-center justify-center">
                  <span className="text-6xl">🎯</span>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {event.title}
              </h1>
              <span className="shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                🔴{" "}
                {startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
              <span>
                🕐{" "}
                {startDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {endDate &&
                  ` - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
              </span>
              <span>📍 {event.venue_name || event.area_label}</span>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-2">
                About this Activity
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {event.description}
              </p>
            </div>

            {/* Proximity info */}
            {event.proximity_public_text && (
              <div className="mb-6 p-3 bg-teal-50 rounded-xl text-sm text-teal-700">
                📍 {event.proximity_public_text} — exact meetup shared after acceptance
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowReport(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition"
              >
                Report this activity
              </button>
            </div>
          </div>

          {/* Right: Squads sidebar */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Squads Going</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {groups.length} Squad{groups.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {groups.map((group) => {
                const isCommunityMember = userCommunityIds.has(
                  group.community_id
                );
                const isFull = group.member_count >= group.capacity;
                const canSocial = isFull && group.allow_social_after_full;
                const canWaitlist = isFull && group.waitlist_enabled;

                return (
                  <div key={group.id}>
                    {group.community && (
                      <div className="mb-1">
                        <CommunityBadge community={group.community} />
                      </div>
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
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">
                          Full
                        </span>
                        {canSocial && (
                          <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                            Social spots available
                          </span>
                        )}
                        {canWaitlist && !canSocial && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Waitlist open
                          </span>
                        )}
                      </div>
                    )}

                    {isCommunityMember ? (
                      <div className="mt-2 flex gap-2">
                        {!isFull && (
                          <button
                            onClick={() => {
                              setJoinGroupId(group.id);
                              setJoinGroupTitle(group.title);
                              setJoinRequestType("participant");
                            }}
                            className="flex-1 py-2 text-sm text-coral-500 font-medium hover:bg-coral-50 rounded-lg transition"
                          >
                            Request to Join
                          </button>
                        )}
                        {isFull && canWaitlist && (
                          <button
                            onClick={() => {
                              setJoinGroupId(group.id);
                              setJoinGroupTitle(group.title);
                              setJoinRequestType("participant");
                            }}
                            className="flex-1 py-2 text-sm text-amber-600 font-medium hover:bg-amber-50 rounded-lg transition"
                          >
                            Join Waitlist
                          </button>
                        )}
                        {canSocial && (
                          <button
                            onClick={() => {
                              setJoinGroupId(group.id);
                              setJoinGroupTitle(group.title);
                              setJoinRequestType("social");
                            }}
                            className="flex-1 py-2 text-sm text-teal-600 font-medium hover:bg-teal-50 rounded-lg transition"
                          >
                            Join to Socialize
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <LockedCTA
                          communityName={
                            group.community?.name || "the community"
                          }
                          onJoinCommunity={() =>
                            router.push("/profile/communities")
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-center p-6 border-2 border-dashed border-gray-200 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-coral-100 text-coral-500 flex items-center justify-center mx-auto mb-2 text-xl">
                +
              </div>
              <p className="font-medium text-gray-700 text-sm">
                Don&apos;t see your vibe?
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Start a new squad and invite others.
              </p>
            </div>
          </div>
        </div>
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
