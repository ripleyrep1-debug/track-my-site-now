// Privileged server-side client for the current backend project.
// Bypasses RLS — server-only, never import from components.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { backendServiceRoleKey, backendUrl } from "./backend-env";

let _client: ReturnType<typeof create> | undefined;

function create() {
  return createClient<Database>(backendUrl(), backendServiceRoleKey(), {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const backendAdmin = new Proxy({} as ReturnType<typeof create>, {
  get(_, prop, receiver) {
    if (!_client) _client = create();
    return Reflect.get(_client, prop, receiver);
  },
});
