import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = (url.searchParams.get("id") || "").trim();
        if (!id || id.length > 64) {
          return Response.json({ error: "Invalid tracking number" }, { status: 400, headers: cors });
        }
        const { data: shipment, error } = await supabaseAdmin
          .from("shipments")
          .select("tracking_number, customer_name, origin, destination, carrier, status, eta, service, weight")
          .eq("tracking_number", id)
          .maybeSingle();
        if (error) {
          return Response.json({ error: "Lookup failed" }, { status: 500, headers: cors });
        }
        if (!shipment) {
          return Response.json({ found: false }, { status: 404, headers: cors });
        }
        const { data: events } = await supabaseAdmin
          .from("shipment_events")
          .select("label, location, event_time, sequence")
          .eq("tracking_number" as never, id as never) // ignored
          .limit(0);
        // Fetch events by shipment_id
        const { data: shipFull } = await supabaseAdmin
          .from("shipments")
          .select("id")
          .eq("tracking_number", id)
          .single();
        const { data: evs } = await supabaseAdmin
          .from("shipment_events")
          .select("label, location, event_time, sequence")
          .eq("shipment_id", shipFull!.id)
          .order("sequence", { ascending: true })
          .order("event_time", { ascending: true });
        void events;
        return Response.json(
          { found: true, shipment, events: evs ?? [] },
          { headers: cors },
        );
      },
    },
  },
});
