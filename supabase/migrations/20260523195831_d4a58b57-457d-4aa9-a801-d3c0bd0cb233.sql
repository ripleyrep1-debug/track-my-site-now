REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM anon, authenticated, PUBLIC;

DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can claim first admin" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins manage events" ON public.shipment_events;

CREATE POLICY "No direct role changes from browser"
ON public.user_roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct shipment changes from browser"
ON public.shipments
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct shipment event changes from browser"
ON public.shipment_events
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);