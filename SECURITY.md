# Security Model

## Authentication

- Supabase Auth handles all authentication
- Session tokens managed via `@supabase/ssr` with HTTP-only cookies
- Middleware (`src/middleware.ts`) refreshes sessions on every request
- No custom JWT handling — all auth delegated to Supabase

## Row Level Security (RLS)

Every table has RLS enabled. Key policies:

### Users
- Read: all authenticated users
- Update: own profile only
- Insert: own profile only (triggered on auth signup)

### Communities
- Read: all authenticated users
- Join: via `community_memberships` insert (own user_id only)

### Groups / Events
- Read: all authenticated users
- Create: authenticated users (creator fields enforced)
- Update: creator/host only

### Group Members / Messages
- Read: group members only (enforced by RLS subquery)
- Write: group members only

### Join Requests
- Insert: requires community membership (enforced by RLS)
- Read: own requests + hosts of the target group

### Notifications
- Read/Update: own notifications only
- Insert: security definer triggers only (no direct user insert)

### Event Sources / Import Runs
- Read: community admins only
- Write: service role / server actions with admin check

## Invite Codes

- Invite codes are **never stored in plaintext**
- Stored as SHA-256 hash in `communities.invite_code_hash`
- Verification via `verify_invite_code()` SECURITY DEFINER function
- Only returns boolean — no hash leakage

## Domain Verification

- `can_join_domain_community()` SECURITY DEFINER function
- Compares `auth.email()` domain against `allowed_email_domains` array
- Falls back to legacy `domain` column

## Server Actions

- All server actions validate input with Zod schemas
- Authentication checked at the start of every action
- Admin-only actions verify `community_memberships.role = 'admin'`

## Rate Limiting (Application Level)

Rate limiting is enforced in the application layer for:
- Join request creation (prevent spam requests)
- Message sending (prevent chat flooding)
- Report creation (prevent abuse)

Implement via middleware or per-action throttling based on user ID.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` is server-only, never exposed to client
- All `NEXT_PUBLIC_` vars are safe for client exposure (anon key has RLS)
- No secrets in git — use environment variables

## Content Security

- User-generated text is rendered as text nodes (not `dangerouslySetInnerHTML`)
- URLs from user input are rendered as `href` attributes (standard browser handling)
- No SQL injection risk — all queries use Supabase client parameterized queries
- XSS mitigated by React's default escaping

## Realtime Security

- Supabase Realtime respects RLS policies
- Users can only receive changes for rows they have SELECT access to
- Typing indicators use broadcast channels (no database writes)
