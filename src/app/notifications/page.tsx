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
      <main className="max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-coral-500 hover:text-coral-600 font-medium transition"
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
                className="h-16 bg-white rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-lg">No notifications yet</p>
            <p className="text-sm mt-1">
              You&apos;ll be notified about squad requests, messages, and
              updates.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left p-4 rounded-xl border transition hover:shadow-sm ${
                  n.read_at
                    ? "bg-white border-gray-100"
                    : "bg-coral-50 border-coral-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${n.read_at ? "text-gray-600" : "text-gray-900 font-medium"}`}
                    >
                      {getNotificationMessage(n)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <div className="w-2 h-2 rounded-full bg-coral-500 shrink-0 mt-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
