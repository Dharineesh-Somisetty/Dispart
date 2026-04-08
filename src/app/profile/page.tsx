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
    async function loadProfile() {
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

    loadProfile();
  }, [supabase]);

  const links = [
    {
      href: "/profile/communities",
      title: "Communities",
      description: "Manage where you’re verified and which squad spaces you can unlock.",
      accent: "bg-coral-250 text-coral-600",
    },
    {
      href: "/profile/preferences",
      title: "Discovery Engine",
      description: "Tune categories, hobbies, distance, and digest rhythm.",
      accent: "bg-teal-100 text-teal-700",
    },
    {
      href: "/schedule",
      title: "My Schedule",
      description: "See your upcoming activity plans and calendar-ready links.",
      accent: "bg-white text-coral-900/65",
    },
    {
      href: "/notifications",
      title: "Notifications",
      description: "Track requests, messages, and activity updates in one stream.",
      accent: "bg-coral-100 text-coral-600",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-14 pt-6">
        {loading ? (
          <div className="space-y-5">
            <div className="h-48 rounded-[36px] skeleton" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-28 rounded-[28px] skeleton" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <section className="surface-card overflow-hidden rounded-[38px] px-6 py-8 md:px-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="flex items-start gap-5">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-coral-250 text-4xl font-bold text-coral-600">
                    {profile?.display_name?.[0]?.toUpperCase() || "D"}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-600">
                      Profile
                    </p>
                    <h1 className="display-font mt-3 text-4xl font-extrabold leading-tight text-coral-900">
                      {profile?.display_name || "Your profile"}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-coral-900/64">
                      {profile?.bio ||
                        "Keep your communities, discovery controls, and squad plans in one vivid home base."}
                    </p>
                  </div>
                </div>

                <div className="rounded-[30px] bg-coral-50 px-5 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-coral-900/45">
                    Quick action
                  </p>
                  <Link
                    href="/create"
                    className="gradient-cta mt-4 inline-flex rounded-full px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_28px_rgb(160,58,15,0.18)]"
                  >
                    Host an activity
                  </Link>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Communities" value={stats?.communities ?? 0} />
              <StatCard label="Upcoming" value={stats?.upcomingActivities ?? 0} />
              <StatCard label="Host requests" value={stats?.pendingRequests ?? 0} />
              <StatCard label="Unread alerts" value={stats?.unreadNotifications ?? 0} />
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="surface-card rounded-[32px] px-6 py-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgb(78,33,30,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral-900/42">
                        Open
                      </p>
                      <h2 className="display-font mt-3 text-3xl font-extrabold text-coral-900">
                        {link.title}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-coral-900/62">
                        {link.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${link.accent}`}
                    >
                      View
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
    <div className="surface-card rounded-[28px] px-5 py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-coral-900/42">
        {label}
      </p>
      <p className="display-font mt-3 text-4xl font-extrabold text-coral-900">
        {value}
      </p>
    </div>
  );
}
