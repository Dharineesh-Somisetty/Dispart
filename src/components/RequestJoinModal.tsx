"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface RequestJoinModalProps {
  groupId: string;
  groupTitle: string;
  requestType?: "participant" | "social";
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestJoinModal({
  groupId,
  groupTitle,
  requestType = "participant",
  onClose,
  onSuccess,
}: RequestJoinModalProps) {
  const [why, setWhy] = useState("");
  const [vibeToday, setVibeToday] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("join_requests")
      .insert({
        group_id: groupId,
        user_id: user.id,
        answers_json: { why, vibe_today: vibeToday, note: note || undefined },
        status: "pending",
        request_type: requestType,
      });

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "You already requested to join this group"
          : insertError.message
      );
    } else {
      const { data: group } = await supabase
        .from("groups")
        .select("event_id")
        .eq("id", groupId)
        .single();

      if (group?.event_id) {
        await supabase.from("event_interactions").insert({
          user_id: user.id,
          event_id: group.event_id,
          type: "join_request",
        });
      }

      onSuccess();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">
            {requestType === "social" ? "Socialize with" : "Join"}{" "}
            &ldquo;{groupTitle}&rdquo;
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why do you want to join? *
            </label>
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              required
              maxLength={200}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400 resize-none"
              placeholder="I love this kind of event and..."
            />
            <span className="text-xs text-gray-400">{why.length}/200</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your vibe today *
            </label>
            <div className="flex gap-2">
              {["chill", "talkative", "flexible"].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVibeToday(v)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    vibeToday === v
                      ? "bg-teal-500 text-white border-teal-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anything else to know?
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral-400"
              placeholder="Optional note..."
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !why || !vibeToday}
            className="w-full py-3 rounded-xl bg-coral-500 text-white font-semibold hover:bg-coral-600 transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
