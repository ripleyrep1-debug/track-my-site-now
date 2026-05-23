import { createFileRoute } from "@tanstack/react-router";
import { createSupabaseAnonServerClient } from "@/integrations/supabase/client.anon.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type LookupResult = {
  found?: boolean;
  error?: string;
  shipment?: Record<string, unknown>;
  events?: unknown[];
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

        const supabase = createSupabaseAnonServerClient();
        const { data, error } = await supabase.rpc("lookup_tracking", {
          p_tracking_number: id,
        });

        if (error) {
          console.error("[track]", error.message);
          return Response.json({ error: "Lookup failed" }, { status: 500, headers: cors });
        }

        const result = data as LookupResult | null;
        if (!result) {
          return Response.json({ found: false }, { headers: cors });
        }
        if (result.error) {
          return Response.json({ error: result.error }, { status: 400, headers: cors });
        }
        if (!result.found) {
          return Response.json({ found: false }, { headers: cors });
        }

        return Response.json(
          { found: true, shipment: result.shipment, events: result.events ?? [] },
          { headers: cors },
        );
      },
    },
  },
});
