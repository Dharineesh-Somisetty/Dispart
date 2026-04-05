import Link from "next/link";
import type { Organizer } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  nonprofit: "Nonprofit",
  venue: "Venue",
  company: "Company",
  musician: "Musician",
  community: "Community",
  individual: "Individual",
};

interface OrganizerBadgeProps {
  organizer: Organizer;
  size?: "sm" | "md";
}

export default function OrganizerBadge({
  organizer,
  size = "sm",
}: OrganizerBadgeProps) {
  const label = TYPE_LABELS[organizer.type] || organizer.type;

  return (
    <Link
      href={`/organizers/${organizer.id}`}
      className={`inline-flex items-center gap-1.5 rounded-full transition hover:opacity-80 ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      } ${
        organizer.verified
          ? "bg-teal-50 text-teal-700 border border-teal-200"
          : "bg-gray-100 text-gray-600 border border-gray-200"
      }`}
    >
      {organizer.logo_url ? (
        <img
          src={organizer.logo_url}
          alt=""
          className={`rounded-full ${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`}
        />
      ) : (
        <span>{organizer.verified ? "✓" : "○"}</span>
      )}
      <span className="font-medium">
        {organizer.verified ? `Verified ${label}` : label}
      </span>
      <span className="text-gray-400">{organizer.name}</span>
    </Link>
  );
}
