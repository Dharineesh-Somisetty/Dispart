-- ============================================
-- STAGE 3 MIGRATION: Dispart
-- Organizers, event enhancements, recommendations signals,
-- group waitlist/social mode, safety/reporting, blocks
-- ============================================

-- ============================================
-- 1) ORGANIZERS TABLE
-- ============================================

create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('company','musician','venue','nonprofit','community','individual')),
  verified boolean not null default false,
  website_url text,
  logo_url text,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2) EVENTS: source + organizer + new fields
-- ============================================

alter table public.events
  add column if not exists organizer_id uuid references public.organizers(id) on delete set null;

alter table public.events
  add column if not exists source text not null default 'community'
    check (source in ('community','organizer','import'));

alter table public.events
  add column if not exists external_url text;

alter table public.events
  add column if not exists price_display text;

alter table public.events
  add column if not exists age_restriction text;

alter table public.events
  add column if not exists status text not null default 'active'
    check (status in ('active','cancelled','completed'));

alter table public.events
  add column if not exists updated_at timestamptz not null default now();

-- Auto-update events.updated_at on update
create or replace function public.handle_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_events_updated_at
  before update on public.events
  for each row
  execute function public.handle_events_updated_at();

-- ============================================
-- 3) RECOMMENDATIONS SIGNALS
-- ============================================

-- Event interactions (views, saves, dismisses, shares, ticket clicks)
create table public.event_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  type text not null check (type in ('view','save','dismiss','share','ticket_click')),
  created_at timestamptz not null default now()
);

create index idx_event_interactions_user on public.event_interactions(user_id);
create index idx_event_interactions_event on public.event_interactions(event_id);
create index idx_event_interactions_type on public.event_interactions(type);

-- User preferences for recommendations
create table public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  mode_preference text not null default 'ALL'
    check (mode_preference in ('ALL','WATCH','DO')),
  categories text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  max_distance_miles int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update user_preferences.updated_at
create or replace function public.handle_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_preferences_updated_at
  before update on public.user_preferences
  for each row
  execute function public.handle_user_preferences_updated_at();

-- ============================================
-- 4) GROUP WAITLIST + SOCIAL MODE
-- ============================================

alter table public.groups
  add column if not exists allow_social_after_full boolean not null default false;

alter table public.groups
  add column if not exists social_only_capacity int not null default 0;

alter table public.groups
  add column if not exists waitlist_enabled boolean not null default true;

-- Join requests: request type + waitlist position
alter table public.join_requests
  add column if not exists request_type text not null default 'participant'
    check (request_type in ('participant','social'));

alter table public.join_requests
  add column if not exists position int;

-- ============================================
-- 5) SAFETY: REPORTS + BLOCKS
-- ============================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  reason text not null check (reason in ('harassment','spam','scam','unsafe','impersonation','other')),
  details text,
  status text not null default 'open'
    check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create index idx_reports_status on public.reports(status);
create index idx_reports_reporter on public.reports(reporter_user_id);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id)
);

create index idx_blocks_blocker on public.blocks(blocker_user_id);
create index idx_blocks_blocked on public.blocks(blocked_user_id);

-- ============================================
-- 6) RLS POLICIES
-- ============================================

-- === ORGANIZERS ===
alter table public.organizers enable row level security;

-- Anyone authenticated can read organizers
create policy "Organizers are viewable by authenticated"
  on public.organizers for select to authenticated using (true);

-- Authenticated users can create unverified organizers
create policy "Authenticated can create unverified organizers"
  on public.organizers for insert to authenticated
  with check (
    auth.uid() = created_by_user_id
    and verified = false
  );

-- Creator can update their own organizer (but cannot set verified=true)
create policy "Creator can update own organizer"
  on public.organizers for update to authenticated
  using (auth.uid() = created_by_user_id)
  with check (verified = false);

-- === EVENT INTERACTIONS ===
alter table public.event_interactions enable row level security;

create policy "Users can insert own interactions"
  on public.event_interactions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own interactions"
  on public.event_interactions for select to authenticated
  using (auth.uid() = user_id);

-- === USER PREFERENCES ===
alter table public.user_preferences enable row level security;

create policy "Users can read own preferences"
  on public.user_preferences for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update to authenticated
  using (auth.uid() = user_id);

-- === REPORTS ===
alter table public.reports enable row level security;

create policy "Users can create reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_user_id);

create policy "Users can read own reports"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_user_id);

-- Admin read-all handled at app level (service role or env-gated)

-- === BLOCKS ===
alter table public.blocks enable row level security;

create policy "Users can create blocks"
  on public.blocks for insert to authenticated
  with check (auth.uid() = blocker_user_id);

create policy "Users can read own blocks"
  on public.blocks for select to authenticated
  using (auth.uid() = blocker_user_id);

create policy "Users can delete own blocks"
  on public.blocks for delete to authenticated
  using (auth.uid() = blocker_user_id);
