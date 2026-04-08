"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { JoinRequest, User } from "@/lib/types";

export default function HostRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [stats, setStats] = useState({ views: 0, squads: 0, members: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) setUser(profile as User);

      const { data: myGroups } = await supabase
        .from("groups")
        .select("id, event_id, events(*)")
        .eq("host_user_id", authUser.id);

      const groupIds = (myGroups || []).map((g) => g.id);

      let totalMembers = 0;
      if (groupIds.length > 0) {
        const { count } = await supabase
          .from("group_members")
          .select("id", { count: "exact", head: true })
          .in("group_id", groupIds);
        totalMembers = count || 0;
      }

      setStats({
        views: 0,
        squads: (myGroups || []).length,
        members: totalMembers,
      });

      if (groupIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: requestsData } = await supabase
        .from("join_requests")
        .select("*, users(*), groups(*, events(*))")
        .in("group_id", groupIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setRequests((requestsData as JoinRequest[]) || []);
      setLoading(false);
    }

    load();
  }, [supabase]);

  async function handleAction(
    requestId: string,
    action: "accepted" | "declined"
  ) {
    setActionLoading(requestId);

    const { error } = await supabase
      .from("join_requests")
      .update({ status: action })
      .eq("id", requestId);

    if (!error) {
      if (action === "accepted") {
        const request = requests.find((r) => r.id === requestId);
        if (request) {
          await supabase.from("group_members").insert({
            group_id: request.group_id,
            user_id: request.user_id,
            role: "member",
          });

          await supabase.from("messages").insert({
            group_id: request.group_id,
            sender_user_id: null,
            body: `${request.users?.display_name || "Someone"} joined the squad!`,
          });
        }
      }

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }

    setActionLoading(null);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 animate-pulse">
          <div className="h-10 w-1/3 rounded-full bg-white/70" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-[24px] bg-white/70" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <section className="surface-card rounded-[34px] p-6 sm:p-8">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-coral-100 text-lg font-bold text-coral-700">
                {user?.display_name?.[0]?.toUpperCase() || "H"}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500/70">
                  Host Queue
                </p>
                <h1 className="display-font mt-2 text-4xl font-extrabold text-[#4e211e]">
                  Welcome back, {user?.display_name || "Host"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f5c59]">
                  Review who wants in, keep groups feeling safe, and stay on
                  top of your upcoming activity spaces.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(41,167,166,0.12),rgba(255,255,255,0.95))] px-5 py-4 text-sm text-[#4f6664]">
              {requests.length > 0
                ? `${requests.length} request${requests.length === 1 ? "" : "s"} waiting for your review`
                : "Your queue is clear right now"}
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="surface-low rounded-[26px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b7c77]">
                Squads Hosted
              </p>
              <p className="mt-2 text-3xl font-bold text-[#4e211e]">
                {stats.squads}
              </p>
              <span className="mt-1 block text-sm text-[#7f5c59]">
                Active groups
              </span>
            </div>

            <div className="surface-low rounded-[26px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b7c77]">
                Total Members
              </p>
              <p className="mt-2 text-3xl font-bold text-[#4e211e]">
                {stats.members}
              </p>
              <span className="mt-1 block text-sm text-[#7f5c59]">
                Across all squads
              </span>
            </div>

            <div className="rounded-[26px] bg-[linear-gradient(135deg,rgba(255,117,89,0.14),rgba(255,255,255,0.95))] p-5 shadow-[0_18px_38px_rgba(160,58,15,0.1)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b7c77]">
                Pending Requests
              </p>
              <p className="mt-2 text-3xl font-bold text-[#4e211e]">
                {requests.length}
              </p>
              <span className="mt-1 block text-sm text-[#7f5c59]">
                Awaiting review
              </span>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display-font text-2xl font-bold text-[#4e211e]">
                Pending Squad Requests
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b7c77]">
                {requests.length} total
              </span>
            </div>

            {requests.length === 0 ? (
              <div className="surface-low rounded-[30px] p-10 text-center">
                <p className="display-font text-3xl font-bold text-[#4e211e]">
                  No pending requests
                </p>
                <p className="mt-2 text-sm leading-6 text-[#7f5c59]">
                  When someone asks to join one of your squads, it will show up
                  here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,246,242,0.95))] p-5 shadow-[0_20px_42px_rgba(120,72,52,0.08)]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-100 text-sm font-semibold text-coral-700">
                          {req.users?.display_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[#4e211e]">
                            {req.users?.display_name || "Unknown"}
                          </p>
                          <p className="mt-1 text-sm text-[#7f5c59]">
                            {req.groups?.events?.title} &middot;{" "}
                            {req.groups?.title}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {req.request_type === "social" && (
                              <span className="rounded-full bg-teal-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                                Social request
                              </span>
                            )}
                            {req.answers_json.vibe_today && (
                              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f726d]">
                                {req.answers_json.vibe_today}
                              </span>
                            )}
                          </div>
                          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6c4d49]">
                            &ldquo;{req.answers_json.why}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2 lg:ml-4">
                        <button
                          onClick={() => handleAction(req.id, "declined")}
                          disabled={actionLoading === req.id}
                          className="rounded-full bg-white/80 px-5 py-3 text-sm font-semibold text-[#6c4d49] transition hover:bg-white disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "accepted")}
                          disabled={actionLoading === req.id}
                          className="gradient-cta rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgb(160,58,15,0.18)] transition disabled:opacity-50"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-low rounded-[30px] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-coral-500">📢</span>
              <h3 className="text-lg font-semibold text-[#4e211e]">
                Broadcast Announcement
              </h3>
            </div>
            <p className="mb-4 text-sm leading-6 text-[#7f5c59]">
              Send an alert to all active squad spaces for your upcoming
              activities.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder='e.g., "Hey everyone! The meetup spot changed, check the updated plan..."'
                className="flex-1 rounded-full border border-coral-100 bg-white/90 px-5 py-3 text-sm text-[#4e211e] placeholder:text-[#a78a83]"
              />
              <button className="gradient-cta whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgb(160,58,15,0.18)]">
                Send to all squads →
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
