import Link from "next/link";
import type { Group, User } from "@/lib/types";

interface GroupCardProps {
  group: Group;
  host?: User;
  memberCount?: number;
  mutualCommunitiesCount?: number;
  showLink?: boolean;
}

export default function GroupCard({
  group,
  host,
  memberCount = 0,
  mutualCommunitiesCount = 0,
  showLink = true,
}: GroupCardProps) {
  const spotsLeft = group.capacity - memberCount;

  const inner = (
    <div className="surface-card rounded-[28px] p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgb(78,33,30,0.1)]">
      <div className="flex items-start justify-between">
        <h4 className="display-font text-lg font-extrabold leading-tight text-coral-900">
          {group.title}
        </h4>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
            spotsLeft <= 1
              ? "bg-coral-250 text-coral-600"
              : "bg-teal-100 text-teal-700"
          }`}
        >
          {memberCount}/{group.capacity} joined
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">
          Host-led squad
        </p>
        <span className="text-[11px] text-coral-900/55">
          {mutualCommunitiesCount} mutual communit
          {mutualCommunitiesCount === 1 ? "y" : "ies"}
        </span>
      </div>

      {group.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-coral-900/70">
          {group.description}
        </p>
      )}

      {host && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-250 text-xs font-bold text-coral-600">
            {host.display_name?.[0]?.toUpperCase() || "H"}
          </div>
          <div>
            <span className="block text-sm font-semibold text-coral-900">
              {host.display_name}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-900/45">
              Host
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (showLink) {
    return <Link href={`/groups/${group.id}`}>{inner}</Link>;
  }
  return inner;
}
