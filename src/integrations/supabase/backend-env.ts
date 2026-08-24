// Backend (Supabase) connection resolution for server-side code.
//
// The platform-injected SUPABASE_* env vars still point at the old, deleted
// project, and that prefix is reserved so it cannot be re-bound from here.
// Server code therefore resolves the backend through these helpers, which
// prefer APP_SUPABASE_* overrides and otherwise fall back to the current
// project's public URL / publishable key.
//
// NOTE: only call these inside server handlers — never at module scope.

const DEFAULT_URL = "https://ytowmbamajcximjjegdi.supabase.co";
const DEFAULT_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0b3dtYmFtYWpjeGltamplZ2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTA3NjgsImV4cCI6MjA5MDYyNjc2OH0.6i8p5kPnLKyfiQm2LqhkVs646HVbB_4vWFO9vUlt_io";

export function backendUrl(): string {
  return process.env["APP_SUPABASE_URL"] || DEFAULT_URL;
}

export function backendPublishableKey(): string {
  return process.env["APP_SUPABASE_PUBLISHABLE_KEY"] || DEFAULT_PUBLISHABLE_KEY;
}

export function backendServiceRoleKey(): string {
  const key = process.env["APP_SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) {
    throw new Error(
      "Missing APP_SUPABASE_SERVICE_ROLE_KEY. Add the new backend's service role key as a secret.",
    );
  }
  return key;
}
