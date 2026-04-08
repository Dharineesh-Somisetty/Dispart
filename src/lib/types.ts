export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
}

export interface Event {
  id: string;
  creator_user_id: string;
  title: string;
  description: string;
  mode: "DO";
  category: string;
  start_time: string;
  end_time: string | null;
  venue_name: string;
  area_label: string;
  lat: number | null;
  lng: number | null;
  proximity_public_text: string;
  image_url: string | null;
  tags: string[];
  created_at: string;
  source: "community";
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
  type: "view" | "save" | "dismiss" | "join_request" | "check_in";
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  max_distance_miles: number;
  include_categories: string[];
  exclude_categories: string[];
  hobby_allowlist: string[];
  hobby_blocklist: string[];
  digest_frequency: "off" | "daily" | "weekly";
  email_opt_in: boolean;
  sms_opt_in: boolean;
  categories?: string[];
  tags?: string[];
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

export interface Community {
  id: string;
  name: string;
  type: "domain" | "invite";
  domain: string | null;
  allowed_email_domains: string[];
  invite_code_hint: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type:
    | "request_received"
    | "request_accepted"
    | "request_declined"
    | "group_message"
    | "event_update"
    | "share_revoked";
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface UserConnection {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}
