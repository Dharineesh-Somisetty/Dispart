# Deployment Guide

## Prerequisites

- Node.js >= 20.9.0
- Supabase project (cloud or self-hosted)
- Railway account (or Vercel/any Node.js hosting)

## Environment Variables

All secrets must be server-only unless prefixed with `NEXT_PUBLIC_`.

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server only | Service role key for admin operations |

**Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.** It bypasses RLS.

## Database Setup

Run migrations in order:

```bash
# Connect to your Supabase SQL editor or use supabase CLI
supabase db push
```

Migration order:
1. `supabase/migrations/00001_schema.sql` — Core tables, RLS, auth trigger
2. `supabase/migrations/00002_stage2.sql` — Share links, community gating, discovery
3. `supabase/migrations/00003_stage3.sql` — Organizers, recommendations, safety
4. `supabase/migrations/00004_stage4.sql` — Notifications, invite codes, event import

After migrations, optionally seed test data:
```bash
psql $DATABASE_URL -f supabase/seed.sql
```

## Supabase Configuration

### Realtime
Enable Realtime for the following tables in Supabase Dashboard > Database > Replication:
- `messages` (for group chat)
- `notifications` (for bell icon updates)

### Auth
- Enable Email auth provider
- Configure redirect URLs for your domain
- Optional: enable Google/GitHub OAuth

### Storage (if adding image uploads later)
- Create a `public` bucket for event images

## Deploy to Railway

1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-detects Next.js and runs `npm run build && npm run start`
4. Set the build command: `npm install && npm run build`
5. Set the start command: `npm run start`
6. Configure PORT (Railway sets this automatically)

## Deploy to Vercel

1. Import project from GitHub
2. Set environment variables in Vercel dashboard
3. Vercel auto-detects Next.js — no config needed
4. Deploy

## Post-Deploy Checklist

- [ ] All 4 migrations run successfully
- [ ] Realtime enabled for `messages` and `notifications`
- [ ] Auth redirect URLs configured for production domain
- [ ] Environment variables set (check no secrets in client bundle)
- [ ] Test login flow end-to-end
- [ ] Test realtime chat in a group
- [ ] Verify notification triggers fire
- [ ] Verify invite code join flow works

## Package Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
```
