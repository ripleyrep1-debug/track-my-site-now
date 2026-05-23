import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

// Returns the Google Maps Platform BROWSER key from the Lovable connector.
// This key is referrer-restricted to *.lovable.app / *.lovableproject.com,
// so it is safe to expose to the browser.
export const Route = createFileRoute("/api/public/maps-key")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      GET: () => {
        const key = process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY || "";
        return Response.json({ key }, { headers: cors });
      },
    },
  },
});
