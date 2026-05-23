-- 1) Remove privilege escalation policy
DROP POLICY IF EXISTS "Authenticated users can claim first admin" ON public.user_roles;

-- 2) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
-- lookup_tracking remains executable by anon/authenticated (intentional public tracking API).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.advance_auto_shipments() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;