-- =============================================================
-- MIGRATION 00006: Fix community membership RLS recursion
-- Restores reliable membership reads for create/profile flows.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_community_admin(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_memberships
    WHERE community_id = p_community_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_community_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view community memberships" ON public.community_memberships;
DROP POLICY IF EXISTS "Users see own memberships" ON public.community_memberships;
CREATE POLICY "Users can view community memberships"
  ON public.community_memberships FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_community_admin(community_id)
  );

DROP POLICY IF EXISTS "Admins can manage community memberships" ON public.community_memberships;
CREATE POLICY "Admins can manage community memberships"
  ON public.community_memberships FOR DELETE TO authenticated
  USING (public.is_community_admin(community_id));

COMMIT;
