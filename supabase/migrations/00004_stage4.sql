-- ============================================
-- STAGE 4 MIGRATION: Dispart
-- Invite codes (secure), domain verification (robust),
-- notifications (in-app), event ingestion support, RLS
-- ============================================

-- ============================================
-- 1) INVITE CODES (secure hash storage)
-- ============================================

-- Enable pgcrypto for hashing
create extension if not exists pgcrypto;

alter table public.communities
  add column if not exists invite_code_hash text;

alter table public.communities
  add column if not exists invite_code_hint text;

-- Function: verify invite code against stored hash
create or replace function public.verify_invite_code(p_community_id uuid, p_code text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_hash text;
begin
  select invite_code_hash into v_hash
  from public.communities
  where id = p_community_id and type = 'invite';

  if v_hash is null then
    return false;
  end if;

  return v_hash = encode(digest(p_code, 'sha256'), 'hex');
end;
$$;

grant execute on function public.verify_invite_code(uuid, text) to authenticated;

-- Helper: set invite code (stores hash, not plaintext)
create or replace function public.set_invite_code(p_community_id uuid, p_code text, p_hint text default null)
returns void
language plpgsql
security definer
as $$
begin
  update public.communities
  set invite_code_hash = encode(digest(p_code, 'sha256'), 'hex'),
      invite_code_hint = coalesce(p_hint, left(p_code, 2) || '***')
  where id = p_community_id and type = 'invite';
end;
$$;

-- Only service role should call set_invite_code in production
grant execute on function public.set_invite_code(uuid, text, text) to authenticated;

-- ============================================
-- 2) DOMAIN VERIFICATION (robust, multi-domain)
-- ============================================

alter table public.communities
  add column if not exists allowed_email_domains text[] not null default '{}'::text[];

-- Backfill: copy existing domain into allowed_email_domains array
update public.communities
set allowed_email_domains = array[domain]
where domain is not null
  and (allowed_email_domains = '{}'::text[] or allowed_email_domains is null);

-- Function: check if current user's email domain matches community
create or replace function public.can_join_domain_community(p_community_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_domain text;
  v_allowed_domains text[];
  v_legacy_domain text;
  v_user_email_domain text;
begin
  select domain, allowed_email_domains
  into v_legacy_domain, v_allowed_domains
  from public.communities
  where id = p_community_id and type = 'domain';

  if not found then
    return false;
  end if;

  v_user_email_domain := split_part(auth.email(), '@', 2);

  if v_user_email_domain is null or v_user_email_domain = '' then
    return false;
  end if;

  -- Check allowed_email_domains array first
  if array_length(v_allowed_domains, 1) > 0 then
    return v_user_email_domain = any(v_allowed_domains);
  end if;

  -- Fallback to legacy single domain
  return v_user_email_domain = v_legacy_domain;
end;
$$;

grant execute on function public.can_join_domain_community(uuid) to authenticated;

-- ============================================
-- 3) NOTIFICATIONS (in-app)
-- ============================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in (
    'request_received',
    'request_accepted',
    'request_declined',
    'group_message',
    'event_update',
    'share_revoked'
  )),
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read on public.notifications(user_id, read_at);
create index idx_notifications_created on public.notifications(created_at desc);

-- RLS: users can read/update their own notifications
alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can mark own notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Insert is restricted to service role / security definer triggers only
-- No direct insert policy for authenticated users

-- ============================================
-- 3a) NOTIFICATION TRIGGER: join_request created -> notify host
-- ============================================

create or replace function public.notify_host_on_join_request()
returns trigger
language plpgsql
security definer
as $$
declare
  v_host_id uuid;
  v_group_title text;
  v_requester_name text;
  v_event_title text;
begin
  select g.host_user_id, g.title, e.title
  into v_host_id, v_group_title, v_event_title
  from public.groups g
  join public.events e on e.id = g.event_id
  where g.id = new.group_id;

  select display_name into v_requester_name
  from public.users where id = new.user_id;

  insert into public.notifications (user_id, type, payload)
  values (
    v_host_id,
    'request_received',
    jsonb_build_object(
      'group_id', new.group_id,
      'group_title', v_group_title,
      'event_title', v_event_title,
      'requester_id', new.user_id,
      'requester_name', coalesce(v_requester_name, 'Someone'),
      'request_type', new.request_type,
      'request_id', new.id
    )
  );

  return new;
end;
$$;

create trigger trg_notify_host_on_join_request
  after insert on public.join_requests
  for each row
  execute function public.notify_host_on_join_request();

-- ============================================
-- 3b) NOTIFICATION TRIGGER: join_request status changed -> notify requester
-- ============================================

create or replace function public.notify_requester_on_request_update()
returns trigger
language plpgsql
security definer
as $$
declare
  v_group_title text;
  v_event_title text;
  v_notif_type text;
begin
  -- Only fire when status changes to accepted or declined
  if old.status = new.status then
    return new;
  end if;

  if new.status not in ('accepted', 'declined') then
    return new;
  end if;

  select g.title, e.title
  into v_group_title, v_event_title
  from public.groups g
  join public.events e on e.id = g.event_id
  where g.id = new.group_id;

  if new.status = 'accepted' then
    v_notif_type := 'request_accepted';
  else
    v_notif_type := 'request_declined';
  end if;

  insert into public.notifications (user_id, type, payload)
  values (
    new.user_id,
    v_notif_type,
    jsonb_build_object(
      'group_id', new.group_id,
      'group_title', v_group_title,
      'event_title', v_event_title,
      'request_id', new.id
    )
  );

  return new;
end;
$$;

create trigger trg_notify_requester_on_request_update
  after update on public.join_requests
  for each row
  execute function public.notify_requester_on_request_update();

-- ============================================
-- 3c) NOTIFICATION TRIGGER: new message -> notify group members (except sender)
-- ============================================

create or replace function public.notify_group_on_message()
returns trigger
language plpgsql
security definer
as $$
declare
  v_group_title text;
  v_sender_name text;
  v_member record;
begin
  -- Skip system messages (no sender)
  if new.sender_user_id is null then
    return new;
  end if;

  select g.title into v_group_title
  from public.groups g where g.id = new.group_id;

  select display_name into v_sender_name
  from public.users where id = new.sender_user_id;

  -- Notify all group members except the sender
  for v_member in
    select gm.user_id
    from public.group_members gm
    where gm.group_id = new.group_id
      and gm.user_id != new.sender_user_id
  loop
    insert into public.notifications (user_id, type, payload)
    values (
      v_member.user_id,
      'group_message',
      jsonb_build_object(
        'group_id', new.group_id,
        'group_title', v_group_title,
        'sender_id', new.sender_user_id,
        'sender_name', coalesce(v_sender_name, 'Someone'),
        'message_preview', left(new.body, 100),
        'message_id', new.id
      )
    );
  end loop;

  return new;
end;
$$;

create trigger trg_notify_group_on_message
  after insert on public.messages
  for each row
  execute function public.notify_group_on_message();

-- ============================================
-- 4) EVENT INGESTION SUPPORT
-- ============================================

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('manual', 'rss', 'ics', 'api')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.event_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.event_sources(id) on delete cascade,
  status text not null check (status in ('running', 'success', 'failed')),
  stats jsonb not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Add import fields to events
alter table public.events
  add column if not exists external_id text;

alter table public.events
  add column if not exists source_id uuid references public.event_sources(id);

alter table public.events
  add column if not exists dedupe_key text;

-- Dedupe indexes
create unique index if not exists idx_events_source_external_id
  on public.events (source_id, external_id)
  where external_id is not null;

create unique index if not exists idx_events_dedupe_key
  on public.events (dedupe_key)
  where dedupe_key is not null;

-- ============================================
-- 5) RLS FOR NEW TABLES
-- ============================================

-- event_sources: admin-only (service role or app-level gating)
alter table public.event_sources enable row level security;

create policy "Admin can read event sources"
  on public.event_sources for select to authenticated
  using (
    exists (
      select 1 from public.community_memberships cm
      where cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- event_import_runs: admin-only
alter table public.event_import_runs enable row level security;

create policy "Admin can read import runs"
  on public.event_import_runs for select to authenticated
  using (
    exists (
      select 1 from public.community_memberships cm
      where cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- ============================================
-- 6) SEED INVITE CODES FOR EXISTING COMMUNITIES
-- ============================================

-- Set invite code for 'Seattle Creatives' community (code: "CREATE2024")
select public.set_invite_code(
  'c2222222-2222-2222-2222-222222222222',
  'CREATE2024',
  'CR***'
);
