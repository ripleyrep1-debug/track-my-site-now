-- Enables Cloudflare / self-host deploy without SUPABASE_SERVICE_ROLE_KEY.
-- Apply via Lovable: ask "Run the SQL in supabase/migrations/20260523120000_self_host_without_service_role.sql"

CREATE POLICY "Authenticated users can claim first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin'::public.app_role
  AND user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin'::public.app_role
  )
);

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_exists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_tracking(p_tracking_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment public.shipments%ROWTYPE;
  v_events jsonb;
  v_id text;
BEGIN
  v_id := trim(p_tracking_number);
  IF v_id IS NULL OR length(v_id) < 3 OR length(v_id) > 64 THEN
    RETURN jsonb_build_object('error', 'Invalid tracking number');
  END IF;

  SELECT * INTO v_shipment FROM public.shipments WHERE tracking_number = v_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'label', e.label,
        'location', e.location,
        'event_time', e.event_time,
        'sequence', e.sequence,
        'latitude', e.latitude,
        'longitude', e.longitude
      )
      ORDER BY e.sequence, e.event_time
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM public.shipment_events e
  WHERE e.shipment_id = v_shipment.id;

  RETURN jsonb_build_object(
    'found', true,
    'shipment', jsonb_build_object(
      'tracking_number', v_shipment.tracking_number,
      'customer_name', v_shipment.customer_name,
      'origin', v_shipment.origin,
      'destination', v_shipment.destination,
      'carrier', v_shipment.carrier,
      'status', v_shipment.status,
      'eta', v_shipment.eta,
      'service', v_shipment.service,
      'weight', v_shipment.weight
    ),
    'events', v_events
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_tracking(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_tracking(text) TO anon, authenticated;
