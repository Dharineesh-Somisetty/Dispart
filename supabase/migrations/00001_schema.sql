-- Dispart MVP Schema
-- Run this in your Supabase SQL editor

-- ============================================
-- TABLES
-- ============================================

-- Users (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Communities
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('domain', 'invite')),
  domain text,
  created_at timestamptz not null default now()
);

-- Community Memberships
create table public.community_memberships (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  unique(community_id, user_id)
);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  mode text not null check (mode in ('WATCH', 'DO')),
  category text not null default 'Other',
  start_time timestamptz not null,
  end_time timestamptz,
  venue_name text not null default '',
  area_label text not null default '',
  lat double precision,
  lng double precision,
  proximity_public_text text not null default '',
  ticket_url text,
  image_url text,
  created_at timestamptz not null default now()
);

-- Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  host_user_id uuid not null references public.users(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  title text not null,
  description text not null default '',
  capacity int not null default 6,
  approval_required boolean not null default true,
  meetup_area_label text not null default '',
  meetup_lat double precision,
  meetup_lng double precision,
  meetup_exact_location_encrypted text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Group Members
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  checkin_status text not null default 'none' check (checkin_status in ('none', 'otw', 'arrived', 'leaving')),
  created_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Join Requests
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answers_json jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_user_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_events_mode on public.events(mode);
create index idx_events_start_time on public.events(start_time);
create index idx_groups_event_id on public.groups(event_id);
create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_join_requests_group_id on public.join_requests(group_id);
create index idx_messages_group_id on public.messages(group_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.users enable row level security;
alter table public.communities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.events enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.messages enable row level security;

-- USERS: anyone logged in can read; users can update their own row
create policy "Users are viewable by authenticated" on public.users
  for select to authenticated using (true);

create policy "Users can update own profile" on public.users
  for update to authenticated using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert to authenticated with check (auth.uid() = id);

-- COMMUNITIES: readable by authenticated
create policy "Communities are viewable" on public.communities
  for select to authenticated using (true);

-- COMMUNITY_MEMBERSHIPS: readable by authenticated; users manage own
create policy "Memberships are viewable" on public.community_memberships
  for select to authenticated using (true);

create policy "Users can join communities" on public.community_memberships
  for insert to authenticated with check (auth.uid() = user_id);

-- EVENTS: readable by all authenticated users
create policy "Events are viewable" on public.events
  for select to authenticated using (true);

create policy "Users can create events" on public.events
  for insert to authenticated with check (auth.uid() = creator_user_id);

create policy "Creators can update events" on public.events
  for update to authenticated using (auth.uid() = creator_user_id);

-- GROUPS: public fields readable by authenticated
create policy "Groups are viewable" on public.groups
  for select to authenticated using (true);

create policy "Users can create groups" on public.groups
  for insert to authenticated with check (auth.uid() = host_user_id);

create policy "Hosts can update groups" on public.groups
  for update to authenticated using (auth.uid() = host_user_id);

-- GROUP_MEMBERS: readable by group members
create policy "Group members are viewable by group members" on public.group_members
  for select to authenticated using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Hosts can add members" on public.group_members
  for insert to authenticated with check (
    exists (
      select 1 from public.groups g
      where g.id = group_id
      and g.host_user_id = auth.uid()
    )
    or (auth.uid() = user_id and role = 'host')
  );

create policy "Members can update own checkin" on public.group_members
  for update to authenticated using (auth.uid() = user_id);

-- JOIN_REQUESTS: requesters see own; hosts see for their groups
create policy "Users see own requests" on public.join_requests
  for select to authenticated using (auth.uid() = user_id);

create policy "Hosts see requests for their groups" on public.join_requests
  for select to authenticated using (
    exists (
      select 1 from public.groups g
      where g.id = group_id
      and g.host_user_id = auth.uid()
    )
  );

create policy "Users can create requests" on public.join_requests
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Hosts can update request status" on public.join_requests
  for update to authenticated using (
    exists (
      select 1 from public.groups g
      where g.id = group_id
      and g.host_user_id = auth.uid()
    )
  );

create policy "Users can cancel own requests" on public.join_requests
  for update to authenticated using (auth.uid() = user_id);

-- MESSAGES: only group members can read and write
create policy "Group members can read messages" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = messages.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Group members can send messages" on public.messages
  for insert to authenticated with check (
    auth.uid() = sender_user_id
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = messages.group_id
      and gm.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGER: auto-create user profile on signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
