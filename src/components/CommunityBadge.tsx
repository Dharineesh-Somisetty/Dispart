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
      className={`inline-flex items-center gap-1 rounded-full font-semibold backdrop-blur-sm ${
        size === "sm"
          ? "px-3 py-1 text-[10px]"
          : "px-4 py-1.5 text-xs"
      } ${
        community.type === "domain"
          ? "bg-white/70 text-teal-700 shadow-[0_10px_25px_rgb(0,102,102,0.08)]"
          : "bg-white/70 text-amber-700 shadow-[0_10px_25px_rgb(128,81,0,0.08)]"
      }`}
    >
      {community.type === "domain" ? "🏫" : "🎨"} {community.name}
    </span>
  );
}
