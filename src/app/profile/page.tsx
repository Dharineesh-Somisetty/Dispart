"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

interface ProfileStats {
  communities: number;
  upcomingActivities: number;
  pendingRequests: number;
  unreadNotifications: number;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

      const [
        profileRes,
        communitiesRes,
        membershipsRes,
        groupsRes,
        notificationsRes,
      ] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase
          .from("community_memberships")
          .select("community_id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("group_members")
          .select("groups(*, events(*))")
          .eq("user_id", user.id),
        supabase
          .from("groups")
          .select("id", { count: "exact", head: true })
          .eq("host_user_id", user.id),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null),
      ]);

      setProfile((profileRes.data as User | null) ?? null);

      let pendingRequests = 0;
      if ((groupsRes.count || 0) > 0) {
        const { data: hostedGroups } = await supabase
          .from("groups")
          .select("id")
          .eq("host_user_id", user.id);

        const groupIds = (hostedGroups || []).map((group) => group.id);
        if (groupIds.length > 0) {
          const { count } = await supabase
            .from("join_requests")
            .select("id", { count: "exact", head: true })
            .in("group_id", groupIds)
            .eq("status", "pending");

          pendingRequests = count || 0;
        }
      }

      const upcomingActivities = (membershipsRes.data || []).filter((row) => {
        const group = (row as Record<string, unknown>).groups as
          | { events?: { start_time?: string | null } }
          | null;

        return Boolean(group?.events?.start_time && group.events.start_time >= cutoff);
      }).length;

      setStats({
        communities: communitiesRes.count || 0,
        upcomingActivities,
        pendingRequests,
        unreadNotifications: notificationsRes.count || 0,
      });
      setLoading(false);
    }

    load();
  }, [supabase]);

  const links = [
    {
      href: "/profile/communities",
      title: "Communities",
      description: "Manage where you’re verified and which squads you can unlock.",
    },
    {
      href: "/profile/preferences",
      title: "Recommendation Settings",
      description: "Tune categories, hobbies, distance, and digest frequency.",
    },
    {
      href: "/schedule",
      title: "My Schedule",
      description: "See your upcoming activities, check-in plans, and calendar links.",
    },
    {
      href: "/notifications",
      title: "Notifications",
      description: "Stay on top of requests, messages, and activity updates.",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 rounded-3xl bg-white shadow-sm skeleton" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-28 rounded-2xl bg-white skeleton" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-[28px] bg-white px-6 py-6 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-coral-100 text-2xl font-semibold text-coral-600">
                    {profile?.display_name?.[0]?.toUpperCase() || "D"}
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                      {profile?.display_name || "Your profile"}
                    </h1>
                    <p className="mt-1 max-w-xl text-sm text-gray-500">
                      {profile?.bio ||
                        "Keep your communities, recommendations, and plans in one place."}
                    </p>
                  </div>
                </div>

                <Link
                  href="/create"
                  className="inline-flex items-center justify-center rounded-2xl bg-coral-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-coral-600 focus:outline-none focus:ring-2 focus:ring-coral-300"
                >
                  Host an activity
                </Link>
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Communities" value={stats?.communities ?? 0} />
              <StatCard
                label="Upcoming"
                value={stats?.upcomingActivities ?? 0}
              />
              <StatCard
                label="Host requests"
                value={stats?.pendingRequests ?? 0}
              />
              <StatCard
                label="Unread alerts"
                value={stats?.unreadNotifications ?? 0}
              />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[24px] bg-white px-5 py-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-coral-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {link.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {link.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      Open
                    </span>
                  </div>
                </Link>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] bg-white px-5 py-5 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
