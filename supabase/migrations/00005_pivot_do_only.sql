-- =============================================================
-- MIGRATION 00005: Pivot to DO-only activities
-- Removes organizer/ticketing/import infrastructure.
-- Adds extended user_preferences for recommendations & digest.
-- Adds user_connections stub for mutual-community counts.
-- =============================================================

BEGIN;

-- 1) Hard-enforce DO-only -----------------------------------------------

UPDATE public.events SET mode = 'DO' WHERE mode <> 'DO';

-- Drop old check if it exists, then add new one
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_mode_check;
ALTER TABLE public.events ADD CONSTRAINT events_mode_check CHECK (mode = 'DO');
ALTER TABLE public.events ALTER COLUMN mode SET DEFAULT 'DO';

-- 2) Deprecate ticketing / organizer / import columns -------------------

-- Events: drop columns that no longer apply
ALTER TABLE public.events
  DROP COLUMN IF EXISTS ticket_url,
  DROP COLUMN IF EXISTS external_url,
  DROP COLUMN IF EXISTS organizer_id,
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS external_id,
  DROP COLUMN IF EXISTS dedupe_key,
  DROP COLUMN IF EXISTS price_display,
  DROP COLUMN IF EXISTS age_restriction,
  DROP COLUMN IF EXISTS is_ticketed,
  DROP COLUMN IF EXISTS price_min;

-- Set source default to 'community' for all rows and constrain
UPDATE public.events SET source = 'community' WHERE source <> 'community';
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE public.events ADD CONSTRAINT events_source_check CHECK (source = 'community');
ALTER TABLE public.events ALTER COLUMN source SET DEFAULT 'community';

-- Drop unused tables (order matters for FK references)
DROP TABLE IF EXISTS public.event_import_runs CASCADE;
DROP TABLE IF EXISTS public.event_sources CASCADE;
DROP TABLE IF EXISTS public.organizers CASCADE;

-- 3) Update event_interactions ------------------------------------------

-- Remove deprecated interaction rows
DELETE FROM public.event_interactions
WHERE type NOT IN ('view', 'save', 'dismiss', 'join_request', 'check_in');

-- Widen the allowed types: remove old check, add new one
ALTER TABLE public.event_interactions DROP CONSTRAINT IF EXISTS event_interactions_type_check;
ALTER TABLE public.event_interactions ADD CONSTRAINT event_interactions_type_check
  CHECK (type IN ('view', 'save', 'dismiss', 'join_request', 'check_in'));

-- 4) Extend user_preferences --------------------------------------------

-- Add new recommendation/digest columns (idempotent with IF NOT EXISTS)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS include_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclude_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hobby_allowlist text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hobby_blocklist text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS digest_frequency text DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS email_opt_in boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false;

ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_digest_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_digest_check
  CHECK (digest_frequency IN ('off', 'daily', 'weekly'));

-- Remove mode_preference since we're DO-only now
-- (keep the column but default it to 'DO')
UPDATE public.user_preferences SET mode_preference = 'DO' WHERE mode_preference <> 'DO';
ALTER TABLE public.user_preferences ALTER COLUMN mode_preference SET DEFAULT 'DO';

-- Provide a safe public read model for squad discovery without exact meetup data.
CREATE OR REPLACE VIEW public.activity_group_previews AS
SELECT
  g.id,
  g.event_id,
  g.host_user_id,
  g.community_id,
  g.title,
  g.description,
  g.capacity,
  g.approval_required,
  g.meetup_area_label,
  g.status,
  g.created_at,
  g.allow_social_after_full,
  g.social_only_capacity,
  g.waitlist_enabled,
  u.display_name AS host_display_name,
  u.avatar_url AS host_avatar_url,
  c.name AS community_name,
  c.type AS community_type,
  (
    SELECT COUNT(*)
    FROM public.group_members gm
    WHERE gm.group_id = g.id
  )::int AS member_count
FROM public.groups g
JOIN public.users u ON u.id = g.host_user_id
JOIN public.communities c ON c.id = g.community_id;

GRANT SELECT ON public.activity_group_previews TO authenticated;

-- 5) Mutual connections stub --------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES public.users(id),
  user_b_id uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a_id, user_b_id),
  CHECK (user_a_id <> user_b_id)
);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Users can see their own connections
DROP POLICY IF EXISTS "Users can view own connections" ON public.user_connections;
CREATE POLICY "Users can view own connections"
  ON public.user_connections FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Users can create connection requests
DROP POLICY IF EXISTS "Users can create connection requests" ON public.user_connections;
CREATE POLICY "Users can create connection requests"
  ON public.user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_a_id);

-- Users can update connections they're part of
DROP POLICY IF EXISTS "Users can update own connections" ON public.user_connections;
CREATE POLICY "Users can update own connections"
  ON public.user_connections FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- 6) RLS hardening -------------------------------------------------------

-- Ensure blocked users can't insert join requests
-- (drop and recreate the insert policy on join_requests)
DROP POLICY IF EXISTS "Users can create requests with community gate" ON public.join_requests;
DROP POLICY IF EXISTS "Community members can request to join groups" ON public.join_requests;
CREATE POLICY "Community members can request to join groups"
  ON public.join_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.community_memberships cm ON cm.community_id = g.community_id
      WHERE g.id = group_id AND cm.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocked_user_id = auth.uid()
        AND b.blocker_user_id = (
          SELECT host_user_id FROM public.groups WHERE id = group_id
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_user_id = auth.uid()
        AND b.blocked_user_id = (
          SELECT host_user_id FROM public.groups WHERE id = group_id
        )
    )
  );

-- Ensure community_memberships SELECT is scoped (user sees own + admins see all)
DROP POLICY IF EXISTS "Users see own memberships" ON public.community_memberships;
DROP POLICY IF EXISTS "Users can view community memberships" ON public.community_memberships;
CREATE POLICY "Users can view community memberships"
  ON public.community_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_memberships cm2
      WHERE cm2.community_id = community_memberships.community_id
        AND cm2.user_id = auth.uid()
        AND cm2.role = 'admin'
    )
  );

-- Messages: only group members can read
DROP POLICY IF EXISTS "Group members can read messages" ON public.messages;
CREATE POLICY "Group members can read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = messages.group_id
        AND gm.user_id = auth.uid()
    )
  );

COMMIT;
