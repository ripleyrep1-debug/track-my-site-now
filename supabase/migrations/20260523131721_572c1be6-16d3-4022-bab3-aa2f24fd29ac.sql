CREATE OR REPLACE FUNCTION public.advance_auto_shipments()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s record;
  inserted_count int := 0;
  -- Stage fractions and labels. The "On hold" stage is computed dynamically
  -- so it always lands exactly one day before delivery.
  base_fractions numeric[] := ARRAY[0.00, 0.05, 0.18, 0.35, 0.55, 0.72];
  base_labels    text[]    := ARRAY[
    'Order received',
    'Picked up from warehouse',
    'Left the warehouse',
    'In transit',
    'Arrived at destination port',
    'Customs clearance'
  ];
  fractions numeric[];
  labels    text[];
  i int;
  total_seconds numeric;
  ev_time timestamptz;
  warehouse_loc text;
  wh_lat numeric;
  wh_lng numeric;
  loc text;
  hold_frac numeric;
BEGIN
  FOR s IN
    SELECT * FROM public.shipments
    WHERE auto_progress = true
      AND transit_days IS NOT NULL
      AND ship_started_at IS NOT NULL
  LOOP
    total_seconds := s.transit_days::numeric * 86400;

    -- Hold lands ~24h before delivery (clamped so very short windows still work)
    hold_frac := GREATEST(0.78, LEAST(0.92, (s.transit_days::numeric - 1.0) / s.transit_days::numeric));

    fractions := base_fractions || ARRAY[hold_frac, GREATEST(hold_frac + 0.04, 0.96), 1.00];
    labels    := base_labels    || ARRAY['On hold - awaiting clearance', 'Out for delivery', 'Delivered'];

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
          ELSIF i >= array_length(fractions, 1) - 1 THEN
            -- Out for delivery & Delivered → at destination
            loc := s.destination;
          ELSIF labels[i] = 'On hold - awaiting clearance' THEN
            loc := s.destination || ' (customs facility)';
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
$function$;