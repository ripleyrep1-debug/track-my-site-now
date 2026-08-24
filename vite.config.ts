// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      // Backend is the ytowmbamajcximjjegdi project. The platform-injected
      // SUPABASE_*/VITE_SUPABASE_* vars still point at the old deleted project,
      // so these are pinned here (URL + publishable key are public values).
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        "https://ytowmbamajcximjjegdi.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0b3dtYmFtYWpjeGltamplZ2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTA3NjgsImV4cCI6MjA5MDYyNjc2OH0.6i8p5kPnLKyfiQm2LqhkVs646HVbB_4vWFO9vUlt_io",
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify("ytowmbamajcximjjegdi"),
    },
  },
});
