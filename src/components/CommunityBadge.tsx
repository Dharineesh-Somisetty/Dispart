import type { Community } from "@/lib/types";

interface CommunityBadgeProps {
  community: Community;
  size?: "sm" | "md";
}

export default function CommunityBadge({
  community,
  size = "sm",
}: CommunityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-3 py-1 text-xs"
      } ${
        community.type === "domain"
          ? "bg-teal-50 text-teal-700"
          : "bg-coral-50 text-coral-700"
      }`}
    >
      {community.type === "domain" ? "🏫" : "🎨"} {community.name}
    </span>
  );
}
