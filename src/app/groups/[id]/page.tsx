"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import PinnedPlanCard from "@/components/PinnedPlanCard";
import ChatComposer from "@/components/ChatComposer";
import ReportModal from "@/components/ReportModal";
import BlockButton from "@/components/BlockButton";
import type {
  Group,
  Event,
  GroupMember,
  Message,
  JoinRequest,
} from "@/lib/types";

const PAGE_SIZE = 50;

export default function GroupSpacePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showReport, setShowReport] = useState<{
    type: "group" | "user";
    userId?: string;
    userName?: string;
  } | null>(null);
  const [waitlistedRequests, setWaitlistedRequests] = useState<JoinRequest[]>(
    []
  );
  const [socialRequests, setSocialRequests] = useState<JoinRequest[]>([]);
  const [memberRequestTypes, setMemberRequestTypes] = useState<
    Record<string, string>
  >({});
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: groupData } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (!groupData) {
        setLoading(false);
        return;
      }
      setGroup(groupData as Group);

      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", groupData.event_id)
        .single();

      if (eventData) setEvent(eventData as Event);

      const { data: membersData } = await supabase
        .from("group_members")
        .select("*, users(*)")
        .eq("group_id", groupId);

      setMembers((membersData as GroupMember[]) || []);

      // Load recent messages with pagination
      const { data: messagesData, count } = await supabase
        .from("messages")
        .select("*, users(*)", { count: "exact" })
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      const sorted = ((messagesData as Message[]) || []).reverse();
      setMessages(sorted);
      setHasOlderMessages((count || 0) > PAGE_SIZE);

      // Load existing share link
      const { data: shareLinks } = await supabase
        .from("share_links")
        .select("token")
        .eq("group_id", groupId)
        .is("revoked_at", null)
        .limit(1);

      if (shareLinks && shareLinks.length > 0) {
        setShareToken(shareLinks[0].token);
      }

      // Load accepted join requests to determine social members
      const { data: acceptedRequests } = await supabase
        .from("join_requests")
        .select("user_id, request_type")
        .eq("group_id", groupId)
        .eq("status", "accepted");

      if (acceptedRequests) {
        const typeMap: Record<string, string> = {};
        for (const r of acceptedRequests) {
          typeMap[r.user_id] = r.request_type;
        }
        setMemberRequestTypes(typeMap);
      }

      // Load waitlisted/social pending requests (for host)
      if (user && groupData.host_user_id === user.id) {
        const { data: pendingReqs } = await supabase
          .from("join_requests")
          .select("*, users(*)")
          .eq("group_id", groupId)
          .eq("status", "pending");

        if (pendingReqs) {
          setWaitlistedRequests(
            (pendingReqs as JoinRequest[]).filter(
              (r) => r.request_type === "participant"
            )
          );
          setSocialRequests(
            (pendingReqs as JoinRequest[]).filter(
              (r) => r.request_type === "social"
            )
          );
        }
      }

      setLoading(false);
      setIsInitialLoad(false);
    }

    load();
  }, [groupId, supabase]);

  // Realtime message subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select("*, users(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              // Prevent duplicates
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as Message];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  // Typing indicator channel (client-only broadcast)
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`typing:${groupId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id === currentUserId) return;
        setTypingUsers((prev) => new Set(prev).add(payload.display_name));

        // Auto-clear after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(payload.display_name);
            return next;
          });
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, currentUserId, supabase]);

  // Auto-scroll to bottom on new messages (only if near bottom)
  useEffect(() => {
    if (isInitialLoad) return;
    const container = messagesContainerRef.current;
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isInitialLoad]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [loading, messages.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load older messages on scroll to top
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasOlderMessages || messages.length === 0) return;
    setLoadingOlder(true);

    const oldestMessage = messages[0];
    const { data: olderData, count } = await supabase
      .from("messages")
      .select("*, users(*)", { count: "exact" })
      .eq("group_id", groupId)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (olderData && olderData.length > 0) {
      const container = messagesContainerRef.current;
      const prevHeight = container?.scrollHeight || 0;

      setMessages((prev) => [
        ...((olderData as Message[]) || []).reverse(),
        ...prev,
      ]);

      // Maintain scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });

      setHasOlderMessages((count || 0) > PAGE_SIZE);
    } else {
      setHasOlderMessages(false);
    }

    setLoadingOlder(false);
  }, [loadingOlder, hasOlderMessages, messages, supabase, groupId]);

  function handleScroll() {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasOlderMessages && !loadingOlder) {
      loadOlderMessages();
    }
  }

  async function handleSend(body: string) {
    if (!currentUserId) return;

    await supabase.from("messages").insert({
      group_id: groupId,
      sender_user_id: currentUserId,
      body,
    });
  }

  function handleTyping() {
    if (!currentUserId) return;
    const members_list = members.find((m) => m.user_id === currentUserId);
    supabase.channel(`typing:${groupId}`).send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: currentUserId,
        display_name: members_list?.users?.display_name || "Someone",
      },
    });
  }

  async function handleCheckin(status: string) {
    if (!currentUserId) return;
    await supabase
      .from("group_members")
      .update({ checkin_status: status })
      .eq("group_id", groupId)
      .eq("user_id", currentUserId);

    if (event && status !== "none") {
      await supabase.from("event_interactions").insert({
        user_id: currentUserId,
        event_id: event.id,
        type: "check_in",
      });
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === currentUserId
          ? { ...m, checkin_status: status as GroupMember["checkin_status"] }
          : m
      )
    );
  }

  async function handleCreateShareLink() {
    if (!currentUserId || shareLoading) return;
    setShareLoading(true);

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const { error } = await supabase.from("share_links").insert({
      group_id: groupId,
      token,
      created_by_user_id: currentUserId,
    });

    if (!error) {
      setShareToken(token);
    }
    setShareLoading(false);
  }

  async function handleRevokeShareLink() {
    if (!shareToken) return;

    await supabase
      .from("share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", shareToken);

    setShareToken(null);
    setShareCopied(false);
  }

  function copyShareLink() {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function handleToggleGroupSetting(
    field: "allow_social_after_full" | "waitlist_enabled",
    value: boolean
  ) {
    if (!group) return;
    await supabase
      .from("groups")
      .update({ [field]: value })
      .eq("id", groupId);

    setGroup({ ...group, [field]: value });
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="mx-auto flex w-full max-w-7xl gap-4 px-4 py-4">
          <div className="hidden h-[calc(100vh-96px)] w-72 animate-pulse rounded-[30px] bg-white/70 lg:block" />
          <div className="h-[calc(100vh-96px)] flex-1 animate-pulse rounded-[34px] bg-white/60" />
          <div className="hidden h-[calc(100vh-96px)] w-80 animate-pulse rounded-[30px] bg-white/70 xl:block" />
        </div>
      </>
    );
  }

  if (!group || !event) {
    return (
      <>
        <Navbar />
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-12">
          <div className="surface-card w-full rounded-[32px] p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-coral-500/70">
              Squad Space
            </p>
            <h1 className="display-font mt-3 text-3xl font-extrabold text-[#4e211e]">
              This squad isn&apos;t available right now
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#7f5c59]">
              It may have been removed, cancelled, or you may no longer have
              access to the space.
            </p>
          </div>
        </div>
      </>
    );
  }

  const isMember = members.some((m) => m.user_id === currentUserId);
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isHost =
    currentMember?.role === "host" || group.host_user_id === currentUserId;

  // Privacy gate: non-members get redirected
  if (!isMember && !loading) {
    return (
      <>
        <Navbar />
        <div className="mx-auto flex min-h-[72vh] max-w-2xl items-center justify-center px-4 py-12">
          <div className="surface-card w-full rounded-[32px] p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-100 text-3xl">
              🔒
            </div>
            <h1 className="display-font mt-5 text-3xl font-extrabold text-[#4e211e]">
              Members only
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#7f5c59]">
              You&apos;ll see the full squad plan, member list, and live chat as
              soon as your request is accepted.
            </p>
            <button
              onClick={() => router.push(`/activities/${event.id}`)}
              className="gradient-cta mt-8 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgb(160,58,15,0.18)]"
            >
              Back to Activity
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row">
        {/* Left sidebar: Members */}
        <aside className="surface-card h-fit w-full shrink-0 rounded-[30px] p-5 lg:sticky lg:top-[88px] lg:w-72 lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500/70">
              Squad Space
            </p>
            <h2 className="display-font mt-2 text-2xl font-extrabold text-[#4e211e]">
              {group.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7f5c59]">
              {members.length} people are in this room with you right now.
            </p>
          </div>

          <div className="space-y-3">
            {members.map((m) => {
              const isSocial = memberRequestTypes[m.user_id] === "social";
              return (
                <div
                  key={m.id}
                  className="surface-low flex items-center gap-3 rounded-[24px] px-3 py-3"
                >
                  <a
                    href={`/profiles/${m.user_id}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-100 text-sm font-semibold text-coral-700 transition hover:ring-2 hover:ring-coral-300"
                  >
                    {m.users?.display_name?.[0]?.toUpperCase() || "?"}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/profiles/${m.user_id}`}
                        className="block truncate text-sm font-semibold text-[#4e211e] transition hover:text-coral-500"
                      >
                        {m.users?.display_name || "User"}
                      </a>
                      {isSocial && (
                        <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                          Social
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {m.role === "host" && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">
                          Host
                        </span>
                      )}
                      {m.checkin_status !== "none" && (
                        <span
                          className={`text-[11px] font-medium ${
                            m.checkin_status === "arrived"
                              ? "text-green-700"
                              : m.checkin_status === "otw"
                                ? "text-amber-700"
                                : "text-[#8f726d]"
                          }`}
                        >
                          {m.checkin_status === "otw"
                            ? "On the way"
                            : m.checkin_status === "arrived"
                              ? "Here"
                              : "Leaving"}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.user_id !== currentUserId && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() =>
                          setShowReport({
                            type: "user",
                            userId: m.user_id,
                            userName: m.users?.display_name,
                          })
                        }
                        className="rounded-full p-2 text-[#ae8b83] transition hover:bg-white/70 hover:text-red-500"
                        title="Report"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Block buttons for members */}
          {members.filter((m) => m.user_id !== currentUserId).length > 0 && (
            <div className="mt-5 border-t border-white/70 pt-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ae8b83]">
                Safety
              </p>
              {members
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => (
                  <div key={m.id} className="mb-2">
                    <BlockButton
                      targetUserId={m.user_id}
                      targetName={m.users?.display_name || "User"}
                      onBlocked={() => {
                        alert(`${m.users?.display_name} has been blocked.`);
                      }}
                    />
                  </div>
                ))}
            </div>
          )}

          {/* Report group */}
          <div className="mt-5 border-t border-white/70 pt-4">
            <button
              onClick={() => setShowReport({ type: "group" })}
              className="text-sm font-medium text-[#8f726d] transition hover:text-red-500"
            >
              Report this group
            </button>
          </div>

          {/* Host settings */}
          {isHost && (
            <div className="mt-5 border-t border-white/70 pt-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ae8b83]">
                Group Settings
              </p>
              <label className="surface-low mb-2 flex cursor-pointer items-center gap-2 rounded-[18px] px-3 py-3 text-sm text-[#6c4d49]">
                <input
                  type="checkbox"
                  checked={group.waitlist_enabled}
                  onChange={(e) =>
                    handleToggleGroupSetting(
                      "waitlist_enabled",
                      e.target.checked
                    )
                  }
                  className="rounded border-coral-200 text-teal-500 focus:ring-teal-400"
                />
                Waitlist when full
              </label>
              <label className="surface-low flex cursor-pointer items-center gap-2 rounded-[18px] px-3 py-3 text-sm text-[#6c4d49]">
                <input
                  type="checkbox"
                  checked={group.allow_social_after_full}
                  onChange={(e) =>
                    handleToggleGroupSetting(
                      "allow_social_after_full",
                      e.target.checked
                    )
                  }
                  className="rounded border-coral-200 text-teal-500 focus:ring-teal-400"
                />
                Social mode when full
              </label>
            </div>
          )}

          {/* Host: waitlisted requests */}
          {isHost && waitlistedRequests.length > 0 && (
            <div className="mt-5 border-t border-white/70 pt-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ae8b83]">
                Waitlist ({waitlistedRequests.length})
              </p>
              {waitlistedRequests.map((r) => (
                <div
                  key={r.id}
                  className="surface-low mb-2 flex items-center gap-1 rounded-[18px] px-3 py-2 text-sm text-[#6c4d49]"
                >
                  <span>{r.users?.display_name || "User"}</span>
                  <span className="text-[#ae8b83]">pending</span>
                </div>
              ))}
            </div>
          )}

          {isHost && socialRequests.length > 0 && (
            <div className="mt-5 border-t border-white/70 pt-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ae8b83]">
                Social Requests ({socialRequests.length})
              </p>
              {socialRequests.map((r) => (
                <div
                  key={r.id}
                  className="surface-low mb-2 flex items-center gap-1 rounded-[18px] px-3 py-2 text-sm text-[#6c4d49]"
                >
                  <span>{r.users?.display_name || "User"}</span>
                  <span className="text-teal-700">social</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center: Chat */}
        <div className="surface-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-[34px]">
          {/* Pinned plan */}
          <div className="border-b border-white/70 px-4 pb-4 pt-4 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500/70">
                  Live Plan
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#4e211e]">
                  Use the room to coordinate arrival, updates, and backup plans.
                </h3>
              </div>
              <div className="rounded-full bg-white/75 px-4 py-2 text-xs font-medium text-[#7f5c59]">
                {typingUsers.size > 0
                  ? `${Array.from(typingUsers).join(", ")} ${typingUsers.size === 1 ? "is" : "are"} typing...`
                  : "Realtime chat is on"}
              </div>
            </div>

            <PinnedPlanCard group={group} event={event} />

            {/* Share plan button */}
            <div className="mt-4 flex items-center gap-2">
              {shareToken ? (
                <>
                  <button
                    onClick={copyShareLink}
                    className="surface-low flex-1 rounded-full px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                  >
                    {shareCopied ? "Copied!" : "Copy Share Link"}
                  </button>
                  {isHost && (
                    <button
                      onClick={handleRevokeShareLink}
                      className="rounded-full bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Revoke
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleCreateShareLink}
                  disabled={shareLoading}
                  className="surface-low flex-1 rounded-full px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-50"
                >
                  {shareLoading ? "Creating..." : "Share Plan"}
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,249,246,0.55),rgba(252,245,242,0.88))] p-4 sm:p-5"
          >
            {/* Load older button */}
            {hasOlderMessages && (
              <div className="text-center">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#8f726d] transition hover:text-[#4e211e] disabled:opacity-50"
                >
                  {loadingOlder ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div className="py-16 text-center text-[#8f726d]">
                <p className="display-font text-2xl font-bold text-[#4e211e]">
                  No messages yet
                </p>
                <p className="mt-2 text-sm">
                  Start the conversation with your squad!
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isOwn = msg.sender_user_id === currentUserId;
              const isSystem = !msg.sender_user_id;

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="text-center text-xs text-gray-400 py-1"
                  >
                    {msg.body}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? "order-2" : ""}`}>
                    {!isOwn && (
                      <p className="mb-1 ml-1 text-xs text-[#9b7c77]">
                        {msg.users?.display_name || "User"} &middot;{" "}
                        {new Date(msg.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    <div
                      className={`rounded-[24px] px-4 py-3 text-sm shadow-[0_14px_30px_rgba(120,72,52,0.08)] ${
                        isOwn
                          ? "bg-coral-500 text-white rounded-br-[10px]"
                          : "bg-white/92 text-[#4e211e] rounded-bl-[10px]"
                      }`}
                    >
                      {msg.body}
                    </div>
                    {isOwn && (
                      <p className="mt-1 mr-1 text-right text-xs text-[#9b7c77]">
                        {new Date(msg.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <ChatComposer onSend={handleSend} onTyping={handleTyping} />
        </div>

        {/* Right sidebar: Event info + Check-in */}
        <aside className="surface-card h-fit w-full shrink-0 rounded-[30px] p-4 lg:sticky lg:top-[88px] lg:w-80 lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
          <div className="mb-4 overflow-hidden rounded-[28px]">
            <div className="relative aspect-[4/3] bg-gray-200">
              {event.image_url ? (
                <Image
                  src={event.image_url}
                  alt={event.title}
                  fill
                  sizes="(min-width: 1024px) 16rem, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral-100 to-teal-100 text-3xl">
                  🎯
                </div>
              )}
            </div>
            <div className="px-1 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">
                {event.category}
              </span>
              <h3 className="display-font mt-2 text-2xl font-extrabold text-[#4e211e]">
                {event.title}
              </h3>
              <p className="mt-3 text-sm text-[#7f5c59]">
                {new Date(event.start_time).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-[#7f5c59]">
                📍 {event.venue_name || event.area_label}
              </p>
            </div>
          </div>

          {group.meetup_exact_location_encrypted && (
            <div className="mb-4 rounded-[24px] bg-teal-50 px-4 py-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
                Exact Meetup
              </p>
              <p className="text-sm leading-6 text-[#245a59]">
                {group.meetup_exact_location_encrypted}
              </p>
            </div>
          )}

          <div className="mb-4 rounded-[24px] bg-white/70 px-4 py-4">
            <p className="text-sm leading-6 text-[#8f726d]">
              📍 Exact location shared only after host accepts you.
            </p>
          </div>

          {currentMember && (
            <div>
              <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#ae8b83]">
                Arriving soon?
              </p>
              <button
                onClick={() =>
                  handleCheckin(
                    currentMember.checkin_status === "arrived"
                      ? "leaving"
                      : currentMember.checkin_status === "otw"
                        ? "arrived"
                        : "otw"
                  )
                }
                className={`w-full rounded-[26px] py-4 text-lg font-bold transition ${
                  currentMember.checkin_status === "arrived"
                    ? "bg-green-100 text-green-700"
                    : currentMember.checkin_status === "otw"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-teal-500 text-white hover:bg-teal-600"
                }`}
              >
                {currentMember.checkin_status === "arrived"
                  ? "I'm Here"
                  : currentMember.checkin_status === "otw"
                    ? "🚗 On the Way"
                    : "👋 I'm Here"}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Report Modal */}
      {showReport && (
        <ReportModal
          title={
            showReport.type === "group"
              ? "Group"
              : showReport.userName || "User"
          }
          reportedUserId={
            showReport.type === "user" ? showReport.userId : undefined
          }
          groupId={showReport.type === "group" ? groupId : undefined}
          onClose={() => setShowReport(null)}
          onSuccess={() => {
            setShowReport(null);
            alert("Report submitted. Thank you.");
          }}
        />
      )}
    </>
  );
}
