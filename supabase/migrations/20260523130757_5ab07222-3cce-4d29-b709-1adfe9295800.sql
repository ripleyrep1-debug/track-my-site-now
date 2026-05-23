
-- 1. New columns
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS origin_warehouse text,
  ADD COLUMN IF NOT EXISTS transit_days int,
  ADD COLUMN IF NOT EXISTS ship_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_progress boolean NOT NULL DEFAULT false;

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_origin_warehouse_check;
ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_origin_warehouse_check
  CHECK (origin_warehouse IS NULL OR origin_warehouse IN ('Greece','Poland','Germany'));

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_transit_days_check;
ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_transit_days_check
  CHECK (transit_days IS NULL OR (transit_days BETWEEN 3 AND 7));

-- 2. Advance function
CREATE OR REPLACE FUNCTION public.advance_auto_shipments()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  inserted_count int := 0;
  fractions numeric[] := ARRAY[0.00, 0.05, 0.18, 0.38, 0.60, 0.80, 0.93, 1.00];
  labels    text[]    := ARRAY[
    'Order received',
    'Picked up from warehouse',
    'Left the warehouse',
    'In transit',
    'Arrived at destination port',
    'Customs clearance',
    'Out for delivery',
    'Delivered'
  ];
  i int;
  total_seconds numeric;
  ev_time timestamptz;
  warehouse_loc text;
  wh_lat numeric;
  wh_lng numeric;
  loc text;
BEGIN
  FOR s IN
    SELECT * FROM public.shipments
    WHERE auto_progress = true
      AND transit_days IS NOT NULL
      AND ship_started_at IS NOT NULL
  LOOP
    total_seconds := s.transit_days::numeric * 86400;

    IF s.origin_warehouse = 'Greece' THEN
      warehouse_loc := 'Athens Warehouse, Greece'; wh_lat := 37.9838; wh_lng := 23.7275;
    ELSIF s.origin_warehouse = 'Poland' THEN
      warehouse_loc := 'Warsaw Warehouse, Poland'; wh_lat := 52.2297; wh_lng := 21.0122;
    ELSIF s.origin_warehouse = 'Germany' THEN
      warehouse_loc := 'Frankfurt Warehouse, Germany'; wh_lat := 50.1109; wh_lng := 8.6821;
    ELSE
      warehouse_loc := COALESCE(s.origin, 'Origin warehouse'); wh_lat := NULL; wh_lng := NULL;
    END IF;

    FOR i IN 1..array_length(fractions, 1) LOOP
      ev_time := s.ship_started_at + make_interval(secs => (fractions[i] * total_seconds)::double precision);
      IF ev_time <= now() THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.shipment_events
          WHERE shipment_id = s.id AND sequence = i
        ) THEN
          IF i <= 3 THEN
            loc := warehouse_loc;
          ELSIF i >= 7 THEN
            loc := s.destination;
          ELSE
            loc := warehouse_loc || ' → ' || s.destination;
          END IF;

          INSERT INTO public.shipment_events (
            shipment_id, label, location, event_time, sequence, latitude, longitude
          )
          VALUES (
            s.id, labels[i], loc, ev_time, i,
            CASE WHEN i <= 3 THEN wh_lat ELSE NULL END,
            CASE WHEN i <= 3 THEN wh_lng ELSE NULL END
          );

          UPDATE public.shipments
          SET status = labels[i], updated_at = now()
          WHERE id = s.id;

          inserted_count := inserted_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_auto_shipments() FROM PUBLIC;

-- 3. Schedule via pg_cron every 15 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance-auto-shipments') THEN
    PERFORM cron.unschedule('advance-auto-shipments');
  END IF;
END $$;

SELECT cron.schedule(
  'advance-auto-shipments',
  '*/15 * * * *',
  $cron$ SELECT public.advance_auto_shipments(); $cron$
);
