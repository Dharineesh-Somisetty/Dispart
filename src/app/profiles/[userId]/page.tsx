"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { User, Group, Event } from "@/lib/types";

interface HostStats {
  groupsHostedCount: number;
  totalMembersCount: number;
  upcomingGroups: (Group & { event: Event })[];
  pastGroups: (Group & { event: Event })[];
}

export default function HostProfilePage() {
  const params = useParams();
  const profileUserId = params.userId as string;

  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<HostStats | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", profileUserId)
        .single();

      if (!userData) {
        setLoading(false);
        return;
      }
      setProfile(userData as User);

      // Get hosted groups with events
      const { data: hostedGroups } = await supabase
        .from("groups")
        .select("*, events(*), group_members(id)")
        .eq("host_user_id", profileUserId);

      const now = new Date().toISOString();
      const upcoming: (Group & { event: Event })[] = [];
      const past: (Group & { event: Event })[] = [];
      let totalMembers = 0;

      for (const g of hostedGroups || []) {
        const event = (g as Record<string, unknown>).events as Event;
        if (!event) continue;

        const memberCount = Array.isArray(
          (g as Record<string, unknown>).group_members
        )
          ? ((g as Record<string, unknown>).group_members as unknown[]).length
          : 0;
        totalMembers += memberCount;

        const item = { ...g, event, events: undefined, group_members: undefined } as Group & { event: Event };

        if (event.start_time >= now) {
          upcoming.push(item);
        } else {
          past.push(item);
        }
      }

      upcoming.sort(
        (a, b) =>
          new Date(a.event.start_time).getTime() -
          new Date(b.event.start_time).getTime()
      );
      past.sort(
        (a, b) =>
          new Date(b.event.start_time).getTime() -
          new Date(a.event.start_time).getTime()
      );

      setStats({
        groupsHostedCount: (hostedGroups || []).length,
        totalMembersCount: totalMembers,
        upcomingGroups: upcoming,
        pastGroups: past,
      });

      setLoading(false);
    }

    load();
  }, [profileUserId, supabase]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-24 w-24 bg-gray-200 rounded-full mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto p-4 text-center py-20 text-gray-400">
          User not found
        </div>
      </>
    );
  }

  const isVerifiedHost = (stats?.groupsHostedCount || 0) >= 3;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto w-full px-4 py-8">
        {/* Profile header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-coral-100 flex items-center justify-center mx-auto mb-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-coral-500">
                {profile.display_name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {profile.display_name}
          </h1>
          {isVerifiedHost && (
            <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
              ✓ Verified Host
            </span>
          )}
          {profile.bio && (
            <p className="text-sm text-gray-500 mt-3 max-w-md mx-auto">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-coral-500">
                {stats.groupsHostedCount}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Squads Hosted</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-teal-500">
                {stats.totalMembersCount}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Total Members</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-700">
                {stats.upcomingGroups.length}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Upcoming</p>
            </div>
          </div>
        )}

        {/* Upcoming groups */}
        {stats && stats.upcomingGroups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Upcoming Squads
            </h2>
            <div className="space-y-3">
              {stats.upcomingGroups.map((g) => (
                <a
                  key={g.id}
                  href={`/events/${g.event.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition"
                >
                  <h3 className="font-semibold text-sm text-gray-900">
                    {g.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {g.event.title} &middot;{" "}
                    {new Date(g.event.start_time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Past groups */}
        {stats && stats.pastGroups.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Past Squads
            </h2>
            <div className="space-y-3">
              {stats.pastGroups.map((g) => (
                <div
                  key={g.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 opacity-60"
                >
                  <h3 className="font-semibold text-sm text-gray-900">
                    {g.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {g.event.title} &middot;{" "}
                    {new Date(g.event.start_time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
