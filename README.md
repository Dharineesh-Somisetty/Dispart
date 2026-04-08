# Dispart — Discover & Participate

A community-first platform for discovering participatory activities, forming squads, and showing up together.

## Concept

Dispart connects people through **activities** — things you *do* together, not just watch. Users discover activities near them, request to join squads (small groups going together), chat with their squad, and check in when they arrive.

### Core Loop
1. **Discover** activities in your area (pottery, hiking, food crawls, pickup sports, volunteer nights)
2. **Join** a squad — verified through your community (university, creative collective, etc.)
3. **Chat** with your squad to coordinate meetup details
4. **Show up** — check in and enjoy the activity together

### Key Features
- **Activities only** — DO mode only, no passive spectating/ticketing flows
- **Community-gated** — join via verified email domain or invite code
- **Squad-based** — small groups with host approval, waitlists, and social mode
- **Safety-first** — exact meetup location hidden until accepted, report/block system
- **Recommendations** — personalized feed based on categories, hobbies, and distance preferences

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + RLS)
- **Validation**: Zod

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

Next.js 16 in this repo requires Node `>= 20.9.0`.

### Database Setup

1. Start a local Supabase instance or connect to a hosted project
2. Run migrations in order: `supabase/migrations/00001_schema.sql` through `00005_pivot_do_only.sql`
3. Seed test data: `supabase/seed.sql`

## Routes

| Route | Description |
|---|---|
| `/` | Recommended activities feed with filters |
| `/create` | Step-by-step activity creation wizard |
| `/activities/[id]` | Activity detail with squads sidebar |
| `/groups/[id]` | Squad space (chat, plan, check-in) |
| `/schedule` | Your upcoming activities |
| `/host/requests` | Host dashboard with pending requests |
| `/profile` | Profile hub for communities, preferences, schedule, and notifications |
| `/profile/communities` | Join/leave communities |
| `/profile/preferences` | Recommendation settings, digest preferences |
| `/notifications` | In-app notification feed |
| `/admin/reports` | Report review (admin) |

## Architecture

- **RLS-first**: All data access gated by Supabase Row Level Security
- **Realtime**: Live chat via Supabase postgres_changes, typing indicators via broadcast
- **Server Actions**: Zod-validated mutations for reports, join requests, messages, activity creation
- **Community verification**: Domain-based (email) or invite-code-based (bcrypt hash)

## Deployment Notes

- Use Node `20.9.0` or newer in local dev and CI.
- Apply migrations through `00005_pivot_do_only.sql` before seeding.
- The public discovery experience now reads squad previews from `public.activity_group_previews` so exact meetup details stay out of the recommended feed.
