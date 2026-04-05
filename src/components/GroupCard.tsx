import Link from "next/link";
import type { Group, User } from "@/lib/types";

interface GroupCardProps {
  group: Group;
  host?: User;
  memberCount?: number;
  showLink?: boolean;
}

export default function GroupCard({
  group,
  host,
  memberCount = 0,
  showLink = true,
}: GroupCardProps) {
  const spotsLeft = group.capacity - memberCount;

  const inner = (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold text-gray-900 text-sm">{group.title}</h4>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            spotsLeft <= 1
              ? "bg-coral-100 text-coral-600"
              : "bg-teal-50 text-teal-700"
          }`}
        >
          {memberCount}/{group.capacity} spots left
        </span>
      </div>

      <p className="text-xs text-teal-600 font-medium mt-1 uppercase tracking-wide">
        Verified Host
      </p>

      {group.description && (
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
          {group.description}
        </p>
      )}

      {host && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-coral-100 flex items-center justify-center text-xs font-medium text-coral-600">
            {host.display_name?.[0]?.toUpperCase() || "H"}
          </div>
          <span className="text-xs text-gray-600">
            {host.display_name}
          </span>
          <span className="text-[10px] text-gray-400">Host</span>
        </div>
      )}
    </div>
  );

  if (showLink) {
    return <Link href={`/groups/${group.id}`}>{inner}</Link>;
  }
  return inner;
}
