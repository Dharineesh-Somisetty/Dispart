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
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex gap-4 h-[calc(100vh-56px)]">
            <div className="w-56 bg-white rounded-2xl animate-pulse" />
            <div className="flex-1 bg-gray-50 rounded-2xl animate-pulse" />
            <div className="w-64 bg-white rounded-2xl animate-pulse" />
          </div>
        </div>
      </>
    );
  }

  if (!group || !event) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto p-4 text-center py-20 text-gray-400">
          Group not found or you don&apos;t have access
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
        <div className="max-w-lg mx-auto p-4 text-center py-20">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Members Only
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            You need to be accepted into this squad to view the group space.
          </p>
          <button
            onClick={() => router.push(`/activities/${event.id}`)}
            className="px-6 py-2.5 bg-coral-500 text-white rounded-xl font-medium text-sm hover:bg-coral-600 transition"
          >
            Back to Activity
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row h-[calc(100vh-56px)]">
        {/* Left sidebar: Members */}
        <aside className="w-full lg:w-56 border-r border-gray-100 bg-white p-4 shrink-0 overflow-y-auto">
          <h2 className="font-bold text-gray-900">{group.title}</h2>
          <p className="text-xs text-gray-400 mb-4">
            {members.length} Members
          </p>

          <div className="space-y-3">
            {members.map((m) => {
              const isSocial = memberRequestTypes[m.user_id] === "social";
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <a
                    href={`/profiles/${m.user_id}`}
                    className="w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center text-xs font-semibold text-coral-600 hover:ring-2 hover:ring-coral-300 transition shrink-0"
                  >
                    {m.users?.display_name?.[0]?.toUpperCase() || "?"}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <a
                        href={`/profiles/${m.user_id}`}
                        className="text-sm font-medium text-gray-900 truncate block hover:text-coral-500 transition"
                      >
                        {m.users?.display_name || "User"}
                      </a>
                      {isSocial && (
                        <span className="text-[9px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                          Social
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {m.role === "host" && (
                        <span className="text-[10px] text-teal-600 font-medium uppercase">
                          Host
                        </span>
                      )}
                      {m.checkin_status !== "none" && (
                        <span
                          className={`text-[10px] font-medium ${
                            m.checkin_status === "arrived"
                              ? "text-green-600"
                              : m.checkin_status === "otw"
                                ? "text-amber-600"
                                : "text-gray-400"
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
                    <div className="shrink-0 flex gap-1">
                      <button
                        onClick={() =>
                          setShowReport({
                            type: "user",
                            userId: m.user_id,
                            userName: m.users?.display_name,
                          })
                        }
                        className="text-gray-300 hover:text-red-400 transition"
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
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                Safety
              </p>
              {members
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => (
                  <div key={m.id} className="mb-1">
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
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowReport({ type: "group" })}
              className="text-xs text-gray-400 hover:text-red-500 transition"
            >
              Report this group
            </button>
          </div>

          {/* Host settings */}
          {isHost && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                Group Settings
              </p>
              <label className="flex items-center gap-2 text-xs text-gray-600 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={group.waitlist_enabled}
                  onChange={(e) =>
                    handleToggleGroupSetting(
                      "waitlist_enabled",
                      e.target.checked
                    )
                  }
                  className="rounded border-gray-300 text-teal-500 focus:ring-teal-400"
                />
                Waitlist when full
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={group.allow_social_after_full}
                  onChange={(e) =>
                    handleToggleGroupSetting(
                      "allow_social_after_full",
                      e.target.checked
                    )
                  }
                  className="rounded border-gray-300 text-teal-500 focus:ring-teal-400"
                />
                Social mode when full
              </label>
            </div>
          )}

          {/* Host: waitlisted requests */}
          {isHost && waitlistedRequests.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                Waitlist ({waitlistedRequests.length})
              </p>
              {waitlistedRequests.map((r) => (
                <div
                  key={r.id}
                  className="text-xs text-gray-600 mb-1 flex items-center gap-1"
                >
                  <span>{r.users?.display_name || "User"}</span>
                  <span className="text-gray-300">- pending</span>
                </div>
              ))}
            </div>
          )}

          {isHost && socialRequests.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                Social Requests ({socialRequests.length})
              </p>
              {socialRequests.map((r) => (
                <div
                  key={r.id}
                  className="text-xs text-gray-600 mb-1 flex items-center gap-1"
                >
                  <span>{r.users?.display_name || "User"}</span>
                  <span className="text-teal-500">social</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
          {/* Pinned plan */}
          <div className="p-4 border-b border-gray-100">
            <PinnedPlanCard group={group} event={event} />

            {/* Share plan button */}
            <div className="mt-3 flex items-center gap-2">
              {shareToken ? (
                <>
                  <button
                    onClick={copyShareLink}
                    className="flex-1 py-2 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition"
                  >
                    {shareCopied ? "Copied!" : "Copy Share Link"}
                  </button>
                  {isHost && (
                    <button
                      onClick={handleRevokeShareLink}
                      className="py-2 px-3 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      Revoke
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleCreateShareLink}
                  disabled={shareLoading}
                  className="flex-1 py-2 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition disabled:opacity-50"
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
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {/* Load older button */}
            {hasOlderMessages && (
              <div className="text-center">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="text-xs text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                >
                  {loadingOlder ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">
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
                      <p className="text-xs text-gray-400 mb-0.5 ml-1">
                        {msg.users?.display_name || "User"} &middot;{" "}
                        {new Date(msg.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isOwn
                          ? "bg-coral-500 text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {msg.body}
                    </div>
                    {isOwn && (
                      <p className="text-xs text-gray-400 mt-0.5 mr-1 text-right">
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

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="px-4 pb-1 text-xs text-gray-400 animate-pulse">
              {Array.from(typingUsers).join(", ")}{" "}
              {typingUsers.size === 1 ? "is" : "are"} typing...
            </div>
          )}

          {/* Composer */}
          <ChatComposer onSend={handleSend} onTyping={handleTyping} />
        </div>

        {/* Right sidebar: Event info + Check-in */}
        <aside className="w-full lg:w-64 border-l border-gray-100 bg-white p-4 shrink-0 overflow-y-auto">
          <div className="rounded-xl overflow-hidden mb-4">
            <div className="relative aspect-video bg-gray-200">
              {event.image_url ? (
                <Image
                  src={event.image_url}
                  alt={event.title}
                  fill
                  sizes="(min-width: 1024px) 16rem, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-coral-100 to-teal-100 flex items-center justify-center text-3xl">
                  🎯
                </div>
              )}
            </div>
            <div className="pt-3">
              <span className="text-[10px] font-medium text-teal-600 uppercase tracking-wider">
                {event.category}
              </span>
              <h3 className="font-semibold text-sm text-gray-900 mt-0.5">
                {event.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(event.start_time).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-gray-500">
                📍 {event.venue_name || event.area_label}
              </p>
            </div>
          </div>

          {group.meetup_exact_location_encrypted && (
            <div className="mb-4 p-3 bg-teal-50 rounded-xl">
              <p className="text-[10px] font-semibold text-teal-700 uppercase mb-1">
                Exact Meetup
              </p>
              <p className="text-sm text-gray-800">
                {group.meetup_exact_location_encrypted}
              </p>
            </div>
          )}

          <div className="mb-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-[10px] text-gray-400">
              📍 Exact location shared only after host accepts you.
            </p>
          </div>

          {currentMember && (
            <div>
              <p className="text-xs text-gray-400 mb-2 text-center">
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
                className={`w-full py-4 rounded-2xl font-bold text-lg transition ${
                  currentMember.checkin_status === "arrived"
                    ? "bg-green-100 text-green-700"
                    : currentMember.checkin_status === "otw"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-teal-400 text-white hover:bg-teal-500"
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
