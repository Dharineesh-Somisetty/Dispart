# Runbook

## Common Operations

### Reset a user's community membership
```sql
DELETE FROM public.community_memberships
WHERE user_id = '<user-id>' AND community_id = '<community-id>';
```

### Set/change an invite code for a community
```sql
SELECT public.set_invite_code(
  '<community-id>',
  'NEW_CODE_HERE',
  'NE***'  -- hint shown to users
);
```

### Add an email domain to a domain community
```sql
UPDATE public.communities
SET allowed_email_domains = array_append(allowed_email_domains, 'newdomain.edu')
WHERE id = '<community-id>';
```

### Verify an organizer
```sql
UPDATE public.organizers SET verified = true WHERE id = '<organizer-id>';
```

### Cancel an event
```sql
UPDATE public.events SET status = 'cancelled' WHERE id = '<event-id>';
```

### Mark all notifications as read for a user
```sql
UPDATE public.notifications
SET read_at = now()
WHERE user_id = '<user-id>' AND read_at IS NULL;
```

## Troubleshooting

### "RLS policy violation" on insert
- Check that `auth.uid()` matches the expected user column in the policy
- Verify the user has the required community membership
- For notifications: inserts must come from triggers, not direct client calls

### Realtime not working
1. Check Supabase Dashboard > Database > Replication — ensure the table is enabled
2. Check browser console for WebSocket connection errors
3. Verify the user has SELECT access via RLS (Realtime respects RLS)
4. Restart the Supabase Realtime service if needed

### Event import failing
1. Check `/admin/import` for the error message in the latest run
2. Common issues:
   - Feed URL unreachable (timeout / DNS)
   - Invalid ICS format (missing VEVENT blocks)
   - Duplicate events (check `dedupe_key` conflicts)
3. Check server logs for `[action:runImport:error]` entries

### Notifications not triggering
1. Verify the triggers exist:
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'trg_notify%';
```
2. Check that the trigger functions exist and haven't been dropped
3. Test manually:
```sql
INSERT INTO public.join_requests (group_id, user_id, answers_json)
VALUES ('<group-id>', '<user-id>', '{"why": "test"}');
-- Should create a notification for the group host
```

### Performance Issues

#### Slow notification queries
```sql
-- Check index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'notifications' AND indexname LIKE '%read%';
```

#### Too many notifications (chat-heavy groups)
- Consider disabling `group_message` notifications for large groups
- Or add a throttle: only notify if user hasn't received a message notification in the last 5 minutes
```sql
-- Check notification volume
SELECT type, count(*), date_trunc('hour', created_at)
FROM public.notifications
GROUP BY type, date_trunc('hour', created_at)
ORDER BY 3 DESC;
```

## Migration Rollback

If a Stage 4 migration needs rollback:

```sql
-- Drop Stage 4 objects in reverse order
DROP TRIGGER IF EXISTS trg_notify_group_on_message ON public.messages;
DROP TRIGGER IF EXISTS trg_notify_requester_on_request_update ON public.join_requests;
DROP TRIGGER IF EXISTS trg_notify_host_on_join_request ON public.join_requests;
DROP FUNCTION IF EXISTS public.notify_group_on_message();
DROP FUNCTION IF EXISTS public.notify_requester_on_request_update();
DROP FUNCTION IF EXISTS public.notify_host_on_join_request();
DROP FUNCTION IF EXISTS public.verify_invite_code(uuid, text);
DROP FUNCTION IF EXISTS public.set_invite_code(uuid, text, text);
DROP FUNCTION IF EXISTS public.can_join_domain_community(uuid);
DROP TABLE IF EXISTS public.event_import_runs;
DROP TABLE IF EXISTS public.event_sources;
DROP TABLE IF EXISTS public.notifications;
ALTER TABLE public.events DROP COLUMN IF EXISTS external_id;
ALTER TABLE public.events DROP COLUMN IF EXISTS source_id;
ALTER TABLE public.events DROP COLUMN IF EXISTS dedupe_key;
ALTER TABLE public.communities DROP COLUMN IF EXISTS invite_code_hash;
ALTER TABLE public.communities DROP COLUMN IF EXISTS invite_code_hint;
ALTER TABLE public.communities DROP COLUMN IF EXISTS allowed_email_domains;
```

## Monitoring

### Key metrics to watch
- Notification table size (can grow fast with active chat groups)
- Event import run failures
- RLS policy evaluation time (check `pg_stat_statements`)

### Log entries to watch
- `[action:*:error]` — server action failures
- `[ErrorBoundary]` — client-side crashes
