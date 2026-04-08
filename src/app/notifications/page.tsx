"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { Notification } from "@/lib/types";

function getNotificationIcon(type: Notification["type"]): string {
  switch (type) {
    case "request_received":
      return "📬";
    case "request_accepted":
      return "🎉";
    case "request_declined":
      return "😔";
    case "group_message":
      return "💬";
    case "event_update":
      return "📅";
    case "share_revoked":
      return "🔒";
    default:
      return "🔔";
  }
}

function getNotificationMessage(n: Notification): string {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case "request_received":
      return `${p.requester_name || "Someone"} wants to join ${p.group_title || "your squad"}${p.request_type === "social" ? " (social)" : ""}`;
    case "request_accepted":
      return `You were accepted into ${p.group_title || "a squad"} for ${p.event_title || "an activity"}`;
    case "request_declined":
      return `Your request to join ${p.group_title || "a squad"} was declined`;
    case "group_message":
      return `${p.sender_name || "Someone"} in ${p.group_title || "a squad"}: ${p.message_preview || ""}`;
    case "event_update":
      return `Update for ${p.event_title || "an activity"}`;
    case "share_revoked":
      return `A share link was revoked for ${p.group_title || "a squad"}`;
    default:
      return "New notification";
  }
}

function getNotificationLink(n: Notification): string {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case "request_received":
      return "/host/requests";
    case "request_accepted":
    case "group_message":
      return p.group_id ? `/groups/${p.group_id}` : "/";
    case "request_declined":
      return p.group_id ? `/groups/${p.group_id}` : "/";
    case "event_update":
      return p.event_id ? `/activities/${p.event_id}` : "/";
    default:
      return "/";
  }
}

function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data as Notification[]) || []);
      setLoading(false);
    }

    load();
  }, [supabase, router]);

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
  }

  async function markAllRead() {
    const unreadIds = notifications
      .filter((n) => !n.read_at)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications((prev) =>
      prev.map((n) =>
        !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
  }

  function handleClick(n: Notification) {
    if (!n.read_at) markRead(n.id);
    router.push(getNotificationLink(n));
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <section className="surface-card rounded-[34px] p-6 sm:p-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500/70">
                Inbox
              </p>
              <h1 className="display-font mt-3 text-4xl font-extrabold text-[#4e211e]">
                Notifications
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#7f5c59]">
                Requests, squad messages, and activity updates all land here so
                you can stay on top of what&apos;s moving.
              </p>
              {unreadCount > 0 && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="surface-low rounded-full px-5 py-3 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-[24px] bg-white/70"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-100 text-3xl">
                🔔
              </div>
              <p className="display-font mt-5 text-3xl font-bold text-[#4e211e]">
                No notifications yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7f5c59]">
                You&apos;ll see join requests, chat updates, and activity
                changes here as soon as they happen.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full rounded-[26px] p-5 text-left transition ${
                    n.read_at
                      ? "surface-low hover:-translate-y-0.5"
                      : "bg-[linear-gradient(135deg,rgba(255,117,89,0.12),rgba(255,255,255,0.96))] shadow-[0_18px_38px_rgba(160,58,15,0.1)] hover:-translate-y-0.5"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/75 text-xl">
                      {getNotificationIcon(n.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-6 ${
                          n.read_at
                            ? "text-[#6c4d49]"
                            : "font-semibold text-[#4e211e]"
                        }`}
                      >
                        {getNotificationMessage(n)}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#9b7c77]">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read_at && (
                      <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-coral-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
