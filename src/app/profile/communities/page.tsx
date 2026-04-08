"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import CommunityBadge from "@/components/CommunityBadge";
import type { Community } from "@/lib/types";

interface CommunityWithMembership extends Community {
  is_member: boolean;
  role: string | null;
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<CommunityWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCommunityId, setInviteCommunityId] = useState<string | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: allCommunities } = await supabase
        .from("communities")
        .select("*")
        .order("name");

      const { data: myMemberships } = await supabase
        .from("community_memberships")
        .select("community_id, role")
        .eq("user_id", user.id);

      const membershipMap = new Map(
        (myMemberships || []).map((m) => [m.community_id, m.role])
      );

      const merged = (allCommunities || []).map((c) => ({
        ...c,
        is_member: membershipMap.has(c.id),
        role: membershipMap.get(c.id) || null,
      })) as CommunityWithMembership[];

      setCommunities(merged);
      setLoading(false);
    }

    load();
  }, [supabase]);

  async function handleJoin(community: CommunityWithMembership) {
    if (!userId) return;
    setError("");
    setSuccessMessage("");
    setActionLoading(community.id);

    if (community.type === "domain") {
      // Use the secure RPC function to verify domain
      const { data: canJoin, error: rpcError } = await supabase.rpc(
        "can_join_domain_community",
        { p_community_id: community.id }
      );

      if (rpcError) {
        setError("Failed to verify domain. Please try again.");
        setActionLoading(null);
        return;
      }

      if (!canJoin) {
        const domains =
          community.allowed_email_domains.length > 0
            ? community.allowed_email_domains.join(", ")
            : community.domain || "unknown";
        setError(
          `Your email domain doesn't match the required domain(s): ${domains}`
        );
        setActionLoading(null);
        return;
      }

      await joinCommunity(community.id);
      setSuccessMessage(`Joined ${community.name} — verified by domain`);
      return;
    }

    if (community.type === "invite") {
      setInviteCommunityId(community.id);
      setActionLoading(null);
      return;
    }
  }

  async function joinCommunity(communityId: string) {
    if (!userId) return;

    const { error: insertError } = await supabase
      .from("community_memberships")
      .insert({ community_id: communityId, user_id: userId });

    if (insertError) {
      setError(insertError.message);
    } else {
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId ? { ...c, is_member: true, role: "member" } : c
        )
      );
    }
    setActionLoading(null);
  }

  async function handleInviteSubmit() {
    if (!inviteCommunityId || !inviteCode.trim()) return;
    setError("");
    setSuccessMessage("");
    setActionLoading(inviteCommunityId);

    // Verify invite code using the secure RPC function
    const { data: isValid, error: rpcError } = await supabase.rpc(
      "verify_invite_code",
      {
        p_community_id: inviteCommunityId,
        p_code: inviteCode.trim(),
      }
    );

    if (rpcError) {
      setError("Failed to verify invite code. Please try again.");
      setActionLoading(null);
      return;
    }

    if (!isValid) {
      setError("Invalid invite code. Please check and try again.");
      setActionLoading(null);
      return;
    }

    const community = communities.find((c) => c.id === inviteCommunityId);
    await joinCommunity(inviteCommunityId);
    setSuccessMessage(
      `Joined ${community?.name || "community"} — invite code verified`
    );
    setInviteCommunityId(null);
    setInviteCode("");
  }

  async function handleLeave(communityId: string) {
    if (!userId) return;
    setActionLoading(communityId);
    setSuccessMessage("");

    const { error: deleteError } = await supabase
      .from("community_memberships")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId ? { ...c, is_member: false, role: null } : c
        )
      );
    }
    setActionLoading(null);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          My Communities
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Join communities to unlock groups and meet people with shared context.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-xl flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 bg-white rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No communities available</p>
            <p className="text-sm mt-1">
              Communities will appear here when they are created.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {communities.map((community) => (
              <div
                key={community.id}
                className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {community.name}
                    </h3>
                    <CommunityBadge community={community} />
                    {community.is_member && (
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                        {community.type === "domain"
                          ? "Verified by domain"
                          : "Verified by invite"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {community.type === "domain"
                      ? community.allowed_email_domains.length > 0
                        ? `Requires @${community.allowed_email_domains.join(" or @")} email`
                        : `Requires @${community.domain} email`
                      : "Invite-only community"}
                    {community.type === "invite" &&
                      community.invite_code_hint && (
                        <span className="text-gray-400 ml-1">
                          (hint: {community.invite_code_hint})
                        </span>
                      )}
                  </p>
                  {community.is_member && community.role && (
                    <p className="text-xs text-teal-600 font-medium mt-1 capitalize">
                      {community.role}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {community.is_member ? (
                    <button
                      onClick={() => handleLeave(community.id)}
                      disabled={actionLoading === community.id}
                      className="px-4 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {actionLoading === community.id ? "..." : "Leave"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(community)}
                      disabled={actionLoading === community.id}
                      className="px-4 py-2 text-sm font-medium text-white bg-coral-500 rounded-lg hover:bg-coral-600 transition disabled:opacity-50"
                    >
                      {actionLoading === community.id ? "..." : "Join"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Invite code modal */}
      {inviteCommunityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6 shadow-xl">
            <h3 className="font-semibold text-lg mb-1">Enter Invite Code</h3>
            <p className="text-xs text-gray-500 mb-4">
              {communities.find((c) => c.id === inviteCommunityId)
                ?.invite_code_hint && (
                <>
                  Hint:{" "}
                  {
                    communities.find((c) => c.id === inviteCommunityId)
                      ?.invite_code_hint
                  }
                </>
              )}
            </p>
            {error && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg">
                {error}
              </div>
            )}
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInviteSubmit()}
              placeholder="Paste invite code..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setInviteCommunityId(null);
                  setInviteCode("");
                  setError("");
                }}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteSubmit}
                disabled={
                  !inviteCode.trim() || actionLoading === inviteCommunityId
                }
                className="flex-1 py-2 text-sm text-white bg-coral-500 rounded-lg hover:bg-coral-600 disabled:opacity-50"
              >
                {actionLoading === inviteCommunityId ? "Verifying..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
