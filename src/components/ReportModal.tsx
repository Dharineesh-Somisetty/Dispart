"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REASONS = [
  { key: "harassment", label: "Harassment" },
  { key: "spam", label: "Spam" },
  { key: "scam", label: "Scam" },
  { key: "unsafe", label: "Unsafe behavior" },
  { key: "impersonation", label: "Impersonation" },
  { key: "other", label: "Other" },
] as const;

interface ReportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  reportedUserId?: string;
  eventId?: string;
  groupId?: string;
  title: string;
}

export default function ReportModal({
  onClose,
  onSuccess,
  reportedUserId,
  eventId,
  groupId,
  title,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
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

    const { error: insertError } = await supabase.from("reports").insert({
      reporter_user_id: user.id,
      reported_user_id: reportedUserId || null,
      event_id: eventId || null,
      group_id: groupId || null,
      reason,
      details: details || null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Report {title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why are you reporting this? *
            </label>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    reason === r.key
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              placeholder="Tell us more about what happened..."
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !reason}
            className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
