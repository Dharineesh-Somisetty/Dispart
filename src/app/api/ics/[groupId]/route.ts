import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === "\n") return "\\n";
    return `\\${match}`;
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("*, events(*)")
    .eq("id", groupId)
    .single();

  if (!group || !group.events) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const event = group.events as Record<string, string | null>;
  const startTime = new Date(event.start_time!);
  const endTime = event.end_time
    ? new Date(event.end_time)
    : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  const location = group.meetup_area_label || event.area_label || "";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dispart//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(startTime)}`,
    `DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${escapeICS(event.title || "")} — ${escapeICS(group.title)}`,
    `DESCRIPTION:${escapeICS(group.description || "")}`,
    `LOCATION:${escapeICS(location)}`,
    `UID:${groupId}@dispart.app`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${group.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`,
    },
  });
}
