"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { Report, User } from "@/lib/types";

const ADMIN_USER_IDS = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "").split(
  ","
);

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-50 text-red-700",
  reviewing: "bg-amber-50 text-amber-700",
  actioned: "bg-green-50 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

type ReportWithUsers = Report & {
  reporter?: User;
  reported_user?: User;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !ADMIN_USER_IDS.includes(user.id)) {
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      // Admin reads all reports using their own RLS (reporter can see own).
      // For a real admin panel you'd use a service role. For MVP we load
      // reports the user has access to. Since admins may not be reporters,
      // we'll use a broad query and rely on an RLS exception or use the
      // Supabase admin key on the server side.
      // For now, fetch from client which means only own reports are visible
      // unless we add an admin RLS policy.
      // Workaround: fetch all reports via the reporter's own reports.
      // In production, this would be a server action.
      const { data: reportsData } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsData) {
        // Fetch reporter and reported user names
        const userIds = new Set<string>();
        for (const r of reportsData) {
          userIds.add(r.reporter_user_id);
          if (r.reported_user_id) userIds.add(r.reported_user_id);
        }

        const { data: usersData } = await supabase
          .from("users")
          .select("*")
          .in("id", Array.from(userIds));

        const usersMap = new Map<string, User>();
        for (const u of usersData || []) {
          usersMap.set(u.id, u as User);
        }

        setReports(
          (reportsData as Report[]).map((r) => ({
            ...r,
            reporter: usersMap.get(r.reporter_user_id),
            reported_user: r.reported_user_id
              ? usersMap.get(r.reported_user_id)
              : undefined,
          }))
        );
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  async function updateReportStatus(
    reportId: string,
    newStatus: string
  ) {
    await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status: newStatus as Report["status"] }
          : r
      )
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto p-4 text-center py-20">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-500 mt-2">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </>
    );
  }

  const filtered =
    statusFilter === "all"
      ? reports
      : reports.filter((r) => r.status === statusFilter);

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Admin: Reports
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {reports.length} total report{reports.length !== 1 ? "s" : ""}
        </p>

        {/* Status filter */}
        <div className="flex gap-2 mb-6">
          {["all", "open", "reviewing", "actioned", "dismissed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                statusFilter === s
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Reports list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No reports found
            </div>
          )}
          {filtered.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl p-4 border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[report.status]}`}
                    >
                      {report.status}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">
                      {report.reason}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">
                    <span className="font-medium">
                      {report.reporter?.display_name || "User"}
                    </span>{" "}
                    reported{" "}
                    {report.reported_user ? (
                      <span className="font-medium">
                        {report.reported_user.display_name}
                      </span>
                    ) : report.event_id ? (
                      <span className="text-gray-500">an event</span>
                    ) : report.group_id ? (
                      <span className="text-gray-500">a group</span>
                    ) : (
                      <span className="text-gray-500">something</span>
                    )}
                  </p>

                  {report.details && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {report.details}
                    </p>
                  )}

                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Status actions */}
                <div className="flex gap-1 shrink-0">
                  {report.status === "open" && (
                    <button
                      onClick={() =>
                        updateReportStatus(report.id, "reviewing")
                      }
                      className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition"
                    >
                      Review
                    </button>
                  )}
                  {(report.status === "open" ||
                    report.status === "reviewing") && (
                    <>
                      <button
                        onClick={() =>
                          updateReportStatus(report.id, "actioned")
                        }
                        className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition"
                      >
                        Action
                      </button>
                      <button
                        onClick={() =>
                          updateReportStatus(report.id, "dismissed")
                        }
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
