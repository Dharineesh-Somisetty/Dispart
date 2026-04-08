"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

function logAction(name: string, data: unknown) {
  console.log(`[action:${name}]`, JSON.stringify(data));
}

function logError(name: string, error: unknown) {
  console.error(
    `[action:${name}:error]`,
    error instanceof Error ? error.message : error
  );
}

// ============================================
// REPORTS
// ============================================

const CreateReportSchema = z.object({
  reported_user_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  reason: z.enum([
    "harassment",
    "spam",
    "scam",
    "unsafe",
    "impersonation",
    "other",
  ]),
  details: z.string().max(2000).optional(),
});

export async function createReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CreateReportSchema.safeParse({
    reported_user_id: formData.get("reported_user_id") || undefined,
    event_id: formData.get("event_id") || undefined,
    group_id: formData.get("group_id") || undefined,
    reason: formData.get("reason"),
    details: formData.get("details") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  logAction("createReport", { userId: user.id, ...parsed.data });

  const { error } = await supabase.from("reports").insert({
    reporter_user_id: user.id,
    ...parsed.data,
  });

  if (error) {
    logError("createReport", error);
    return { error: error.message };
  }

  return { success: true };
}

// ============================================
// JOIN REQUESTS
// ============================================

const CreateJoinRequestSchema = z.object({
  group_id: z.string().uuid(),
  request_type: z.enum(["participant", "social"]),
  why: z.string().min(1).max(500),
  vibe_today: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
});

export async function createJoinRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CreateJoinRequestSchema.safeParse({
    group_id: formData.get("group_id"),
    request_type: formData.get("request_type") || "participant",
    why: formData.get("why"),
    vibe_today: formData.get("vibe_today") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  logAction("createJoinRequest", { userId: user.id, ...parsed.data });

  const { error } = await supabase.from("join_requests").insert({
    group_id: parsed.data.group_id,
    user_id: user.id,
    request_type: parsed.data.request_type,
    answers_json: {
      why: parsed.data.why,
      vibe_today: parsed.data.vibe_today || "",
      note: parsed.data.note || "",
    },
  });

  if (error) {
    logError("createJoinRequest", error);
    return { error: error.message };
  }

  return { success: true };
}

// ============================================
// MESSAGES
// ============================================

const SendMessageSchema = z.object({
  group_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = SendMessageSchema.safeParse({
    group_id: formData.get("group_id"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("messages").insert({
    group_id: parsed.data.group_id,
    sender_user_id: user.id,
    body: parsed.data.body,
  });

  if (error) {
    logError("sendMessage", error);
    return { error: error.message };
  }

  return { success: true };
}

// ============================================
// ACTIVITIES (create)
// ============================================

const CreateActivitySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1).max(50),
  venue_name: z.string().min(1).max(200),
  area_label: z.string().max(200).optional(),
  start_time: z.string().min(1),
  end_time: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  tags: z.string().optional(),
});

export async function createActivity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CreateActivitySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    venue_name: formData.get("venue_name"),
    area_label: formData.get("area_label") || undefined,
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time") || undefined,
    image_url: formData.get("image_url") || undefined,
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  logAction("createActivity", { userId: user.id, title: parsed.data.title });

  const parsedTags = (parsed.data.tags || "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .insert({
      creator_user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      mode: "DO",
      category: parsed.data.category,
      venue_name: parsed.data.venue_name,
      area_label: parsed.data.area_label || "",
      proximity_public_text: parsed.data.area_label
        ? `Near ${parsed.data.area_label}`
        : "",
      start_time: new Date(parsed.data.start_time).toISOString(),
      end_time: parsed.data.end_time
        ? new Date(parsed.data.end_time).toISOString()
        : null,
      image_url: parsed.data.image_url || null,
      tags: parsedTags,
      source: "community",
      status: "active",
    })
    .select()
    .single();

  if (eventError) {
    logError("createActivity:event", eventError);
    return { error: eventError.message };
  }

  return { data: { id: eventData.id } };
}
