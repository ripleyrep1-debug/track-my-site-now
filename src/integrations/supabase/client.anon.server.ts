import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { backendPublishableKey, backendUrl } from "./backend-env";

export function createSupabaseAnonServerClient() {
  return createClient<Database>(backendUrl(), backendPublishableKey(), {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
