"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SharePreview } from "@/lib/types";

export default function SharePreviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc("get_share_preview", {
        p_token: token,
      });

      if (error || !data || (data as SharePreview[]).length === 0) {
        setNotFound(true);
      } else {
        setPreview((data as SharePreview[])[0]);
      }
      setLoading(false);
    }

    load();
  }, [token, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading plan...</div>
      </div>
    );
  }

  if (notFound || !preview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Link Expired or Invalid
          </h1>
          <p className="text-sm text-gray-500">
            This share link may have been revoked or doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const startDate = new Date(preview.start_time);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6">
        <p className="text-sm font-bold text-coral-500 text-center">
          Dispart
        </p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Colored header */}
          <div className="bg-gradient-to-r from-coral-400 to-teal-400 p-6 text-white">
            <p className="text-xs font-medium uppercase tracking-wider opacity-80 mb-1">
              You&apos;re Invited
            </p>
            <h1 className="text-xl font-bold">{preview.event_title}</h1>
          </div>

          <div className="p-6 space-y-4">
            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center text-coral-500">
                📅
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {startDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {startDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-500">
                📍
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {preview.area_label}
                </p>
                {preview.meetup_area_label && (
                  <p className="text-xs text-gray-500">
                    Meetup: {preview.meetup_area_label}
                  </p>
                )}
              </div>
            </div>

            {/* Members */}
            {preview.member_first_names &&
              preview.member_first_names.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center text-coral-500">
                    👥
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {preview.member_first_names.length} Going
                    </p>
                    <p className="text-xs text-gray-500">
                      {preview.member_first_names.join(", ")}
                    </p>
                  </div>
                </div>
              )}
          </div>

          {/* Footer CTA */}
          <div className="border-t border-gray-100 p-6">
            <a
              href={`/activities/${preview.event_id}`}
              className="block w-full py-3 rounded-xl bg-coral-500 text-white font-semibold text-center text-sm hover:bg-coral-600 transition"
            >
              View Activity & Join a Squad
            </a>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Sign in or create an account to join
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
