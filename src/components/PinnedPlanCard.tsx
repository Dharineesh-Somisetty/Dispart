import type { Group, Event } from "@/lib/types";

interface PinnedPlanCardProps {
  group: Group;
  event: Event;
}

export default function PinnedPlanCard({ group, event }: PinnedPlanCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-coral-600 to-coral-400 p-6 text-white shadow-[0_24px_50px_rgb(160,58,15,0.2)]">
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-200" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
            The Plan
          </span>
        </div>

        <h3 className="display-font text-2xl font-extrabold tracking-tight">
          Meet at {group.meetup_area_label || "TBD"}
        </h3>
        <p className="mt-2 text-sm font-medium text-white/80">
          {new Date(event.start_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          for {event.title}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-white/14 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
              Activity
            </p>
            <p className="mt-1 text-sm font-semibold">{event.category}</p>
          </div>
          <div className="rounded-[22px] bg-teal-600 px-4 py-3 text-teal-100 shadow-[0_12px_30px_rgb(0,102,102,0.2)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-200/80">
              Status
            </p>
            <p className="mt-1 text-sm font-semibold">Check in when you arrive</p>
          </div>
        </div>
      </div>
    </div>
  );
}
