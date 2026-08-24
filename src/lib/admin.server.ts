import { backendAdmin as supabaseAdmin } from "@/integrations/supabase/backend.server";

export function getAdminDb() {
  return supabaseAdmin;
}

export async function hasAdminRole(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function adminAlreadyExists() {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}