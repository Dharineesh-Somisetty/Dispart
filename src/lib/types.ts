export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  type: "domain" | "invite";
  domain: string | null;
  created_at: string;
}

export interface Organizer {
  id: string;
  name: string;
  type: "company" | "musician" | "venue" | "nonprofit" | "community" | "individual";
  verified: boolean;
  website_url: string | null;
  logo_url: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  creator_user_id: string;
  title: string;
  description: string;
  mode: "WATCH" | "DO";
  category: string;
  start_time: string;
  end_time: string | null;
  venue_name: string;
  area_label: string;
  lat: number | null;
  lng: number | null;
  proximity_public_text: string;
  ticket_url: string | null;
  image_url: string | null;
  tags: string[];
  price_min: number | null;
  is_ticketed: boolean;
  created_at: string;
  // Stage 3
  organizer_id: string | null;
  source: "community" | "organizer" | "import";
  external_url: string | null;
  price_display: string | null;
  age_restriction: string | null;
  status: "active" | "cancelled" | "completed";
  updated_at: string;
}

export interface Group {
  id: string;
  event_id: string;
  host_user_id: string;
  community_id: string;
  title: string;
  description: string;
  capacity: number;
  approval_required: boolean;
  meetup_area_label: string;
  meetup_lat: number | null;
  meetup_lng: number | null;
  meetup_exact_location_encrypted: string | null;
  status: "active" | "cancelled";
  created_at: string;
  // Stage 3
  allow_social_after_full: boolean;
  social_only_capacity: number;
  waitlist_enabled: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "host" | "member";
  checkin_status: "none" | "otw" | "arrived" | "leaving";
  created_at: string;
  users?: User;
}

export interface JoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  answers_json: {
    why?: string;
    vibe_today?: string;
    note?: string;
  };
  status: "pending" | "accepted" | "declined" | "cancelled";
  request_type: "participant" | "social";
  position: number | null;
  created_at: string;
  users?: User;
  groups?: Group & { events?: Event };
}

export interface Message {
  id: string;
  group_id: string;
  sender_user_id: string | null;
  body: string;
  created_at: string;
  users?: User | null;
}

export interface ShareLink {
  id: string;
  group_id: string;
  token: string;
  created_by_user_id: string;
  created_at: string;
  revoked_at: string | null;
}

export interface SharePreview {
  group_id: string;
  event_id: string;
  event_title: string;
  start_time: string;
  area_label: string;
  meetup_area_label: string;
  meetup_time_hint: string;
  member_first_names: string[];
}

export interface EventInteraction {
  id: string;
  user_id: string;
  event_id: string;
  type: "view" | "save" | "dismiss" | "share" | "ticket_click";
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  mode_preference: "ALL" | "WATCH" | "DO";
  categories: string[];
  tags: string[];
  max_distance_miles: number;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_user_id: string;
  reported_user_id: string | null;
  event_id: string | null;
  group_id: string | null;
  reason: "harassment" | "spam" | "scam" | "unsafe" | "impersonation" | "other";
  details: string | null;
  status: "open" | "reviewing" | "actioned" | "dismissed";
  created_at: string;
}

export interface Block {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  created_at: string;
}
