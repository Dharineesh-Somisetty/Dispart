-- ============================================
-- STAGE 2 MIGRATION: Dispart
-- Share links, community gating, discovery improvements, RLS tightening
-- ============================================

-- ============================================
-- A1) SHARE LINKS TABLE
-- ============================================

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token text not null unique,
  created_by_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index idx_share_links_group_id on public.share_links(group_id);
create index idx_share_links_token on public.share_links(token);

-- ============================================
-- A2) GROUPS: community_id NOT NULL
-- ============================================

-- Backfill any NULL community_id with the first community
update public.groups
set community_id = (select id from public.communities order by created_at limit 1)
where community_id is null;

-- Drop existing FK and re-add with NOT NULL + ON DELETE RESTRICT
alter table public.groups
  alter column community_id set not null;

alter table public.groups
  drop constraint if exists groups_community_id_fkey;

alter table public.groups
  add constraint groups_community_id_fkey
  foreign key (community_id) references public.communities(id) on delete restrict;

-- ============================================
-- A3) EVENTS: discovery columns
-- ============================================

alter table public.events
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.events
  add column if not exists price_min numeric;

alter table public.events
  add column if not exists is_ticketed boolean not null default false;

create index if not exists idx_events_category on public.events(category);
create index if not exists idx_events_is_ticketed on public.events(is_ticketed);
create index if not exists idx_events_tags on public.events using gin(tags);

-- ============================================
-- A4) USERS: bio column for host profile
-- ============================================

alter table public.users
  add column if not exists bio text not null default '';

-- ============================================
-- B) RLS UPDATES
-- ============================================

-- B1) community_memberships: tighten SELECT to own memberships or community admins
drop policy if exists "Memberships are viewable" on public.community_memberships;

create policy "Users see own memberships" on public.community_memberships
  for select to authenticated using (
    auth.uid() = user_id
    or exists (
      select 1 from public.community_memberships cm
      where cm.community_id = community_memberships.community_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- Allow users to leave communities (delete own row)
create policy "Users can leave communities" on public.community_memberships
  for delete to authenticated using (auth.uid() = user_id);

-- Allow community admins to manage memberships
create policy "Admins can manage community memberships" on public.community_memberships
  for delete to authenticated using (
    exists (
      select 1 from public.community_memberships cm
      where cm.community_id = community_memberships.community_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- B2) join_requests: enforce community membership for insert
drop policy if exists "Users can create requests" on public.join_requests;

create policy "Users can create requests with community gate" on public.join_requests
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.groups g
      join public.community_memberships cm on cm.community_id = g.community_id
      where g.id = join_requests.group_id
        and cm.user_id = auth.uid()
    )
  );

-- B4) share_links: enable RLS
alter table public.share_links enable row level security;

-- Group members can create share links
create policy "Group members can create share links" on public.share_links
  for insert to authenticated with check (
    auth.uid() = created_by_user_id
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = share_links.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Group members can read share links for their group
create policy "Group members can read share links" on public.share_links
  for select to authenticated using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = share_links.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Host can revoke share links (update revoked_at)
create policy "Host can revoke share links" on public.share_links
  for update to authenticated using (
    exists (
      select 1 from public.groups g
      where g.id = share_links.group_id
        and g.host_user_id = auth.uid()
    )
  );

-- B5) RPC for share page (public-safe preview)
create or replace function public.get_share_preview(p_token text)
returns table (
  group_id uuid,
  event_id uuid,
  event_title text,
  start_time timestamptz,
  area_label text,
  meetup_area_label text,
  meetup_time_hint text,
  member_first_names text[]
)
language plpgsql
security definer
as $$
begin
  return query
  select
    g.id as group_id,
    e.id as event_id,
    e.title as event_title,
    e.start_time,
    e.area_label,
    g.meetup_area_label,
    ''::text as meetup_time_hint,
    array(
      select split_part(u.display_name, ' ', 1)
      from public.group_members gm
      join public.users u on u.id = gm.user_id
      where gm.group_id = g.id
      order by gm.created_at
    ) as member_first_names
  from public.share_links sl
  join public.groups g on g.id = sl.group_id
  join public.events e on e.id = g.event_id
  where sl.token = p_token
    and sl.revoked_at is null;
end;
$$;

-- Grant execute to anon and authenticated
grant execute on function public.get_share_preview(text) to anon;
grant execute on function public.get_share_preview(text) to authenticated;
