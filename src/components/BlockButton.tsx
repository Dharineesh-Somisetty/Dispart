"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BlockButtonProps {
  targetUserId: string;
  targetName: string;
  onBlocked?: () => void;
}

export default function BlockButton({
  targetUserId,
  targetName,
  onBlocked,
}: BlockButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleBlock() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Insert block
    await supabase.from("blocks").insert({
      blocker_user_id: user.id,
      blocked_user_id: targetUserId,
    });

    // Cancel any pending join requests between users
    const { data: myGroups } = await supabase
      .from("groups")
      .select("id")
      .eq("host_user_id", user.id);

    if (myGroups) {
      const groupIds = myGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        await supabase
          .from("join_requests")
          .update({ status: "cancelled" })
          .eq("user_id", targetUserId)
          .in("group_id", groupIds)
          .eq("status", "pending");
      }
    }

    setLoading(false);
    setConfirming(false);
    onBlocked?.();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">
          Block {targetName}?
        </span>
        <button
          onClick={handleBlock}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
        >
          {loading ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-400 hover:text-red-600 transition"
    >
      Block
    </button>
  );
}
