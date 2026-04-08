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

      // Count total members across hosted groups
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
        <div className="max-w-5xl mx-auto p-6 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto w-full px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-coral-100 flex items-center justify-center text-coral-600 font-bold">
              {user?.display_name?.[0]?.toUpperCase() || "H"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back, {user?.display_name || "Host"}
              </h1>
              <p className="text-sm text-gray-400">
                Here&apos;s what&apos;s happening with your activities.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Squads Hosted
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.squads}
            </p>
            <span className="text-xs text-gray-400">Active groups</span>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Total Members
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.members}
            </p>
            <span className="text-xs text-gray-400">Across all squads</span>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Pending Requests
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {requests.length}
            </p>
            <span className="text-xs text-gray-400">Awaiting review</span>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              Pending Squad Requests
            </h2>
            <span className="text-xs text-gray-400">
              {requests.length} total
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
              <p>No pending requests</p>
              <p className="text-sm mt-1">
                When someone requests to join your squad, it will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border border-gray-100 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                        {req.users?.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {req.users?.display_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {req.groups?.events?.title} &middot;{" "}
                          {req.groups?.title}
                        </p>
                        {req.request_type === "social" && (
                          <span className="inline-block mt-1 text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                            Social request
                          </span>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          &ldquo;{req.answers_json.why}&rdquo;
                        </p>
                        {req.answers_json.vibe_today && (
                          <span className="inline-block mt-1 text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                            {req.answers_json.vibe_today}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 ml-4">
                      <button
                        onClick={() => handleAction(req.id, "declined")}
                        disabled={actionLoading === req.id}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "accepted")}
                        disabled={actionLoading === req.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
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

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-coral-500">📢</span>
            <h3 className="font-semibold text-gray-900">
              Broadcast Announcement
            </h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Send an alert to all active squad spaces for your upcoming
            activities.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='e.g., "Hey everyone! The meetup spot changed, check the updated plan..."'
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
            />
            <button className="px-5 py-2.5 bg-coral-500 text-white font-medium text-sm rounded-lg hover:bg-coral-600 transition whitespace-nowrap">
              Send to all squads &rarr;
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
