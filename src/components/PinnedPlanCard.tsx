import type { Group, Event } from "@/lib/types";

interface PinnedPlanCardProps {
  group: Group;
  event: Event;
}

export default function PinnedPlanCard({ group, event }: PinnedPlanCardProps) {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-teal-500" />
        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
          The Plan
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900">
        Meet at{" "}
        <span className="text-teal-600 font-semibold">
          {group.meetup_area_label || "TBD"}
        </span>{" "}
        at{" "}
        <span className="text-teal-600 font-semibold">
          {new Date(event.start_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </p>
      {group.meetup_exact_location_encrypted && (
        <p className="text-xs text-gray-500 mt-1">
          Exact location shared with members
        </p>
      )}
    </div>
  );
}
