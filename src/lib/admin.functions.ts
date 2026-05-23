import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function fail(scope: string, error: unknown, generic = "Operation failed"): never {
  const msg = error && typeof error === "object" && "message" in error ? (error as { message: string }).message : String(error);
  console.error(`[admin:${scope}]`, msg);
  throw new Error(generic);
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) fail("assertAdmin", error, "Authorization check failed");
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    return {
      userId: context.userId,
      isAdmin: !!roles?.some((r) => r.role === "admin"),
      adminCount: count ?? 0,
    };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Atomic: the partial unique index `one_admin_only` guarantees that only
    // one row with role='admin' can ever be inserted. Concurrent callers race
    // safely — the loser gets a unique violation (Postgres code 23505).
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") throw new Error("An admin already exists");
      fail("claimFirstAdmin", error, "Could not claim admin role");
    }
    return { ok: true };
  });

export const listShipments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("shipments")
      .select("id, tracking_number, customer_name, customer_email, origin, destination, status, eta, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) fail("listShipments", error, "Could not load shipments");
    return { shipments: data ?? [] };
  });

const ShipmentInput = z.object({
  tracking_number: z.string().min(3).max(64).regex(/^[A-Za-z0-9_\-]+$/),
  customer_name: z.string().max(200).optional().nullable(),
  customer_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  origin: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  carrier: z.string().min(1).max(200).default("Rapidexpresscargo Express"),
  status: z.string().min(1).max(100).default("Order received"),
  eta: z.string().optional().nullable().or(z.literal("")),
  weight: z.string().max(50).optional().nullable(),
  service: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShipmentInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      ...data,
      customer_email: data.customer_email || null,
      eta: data.eta ? new Date(data.eta).toISOString() : null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("shipments")
      .insert(payload)
      .select()
      .single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") throw new Error("A shipment with this tracking number already exists");
      fail("createShipment", error, "Could not create shipment");
    }
    return { shipment: row };
  });

export const updateShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: ShipmentInput.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch = { ...data.patch } as Record<string, unknown>;
    if ("eta" in patch) patch.eta = patch.eta ? new Date(patch.eta as string).toISOString() : null;
    if ("customer_email" in patch && !patch.customer_email) patch.customer_email = null;
    const { error } = await supabaseAdmin.from("shipments").update(patch as never).eq("id", data.id);
    if (error) fail("updateShipment", error, "Could not update shipment");
    return { ok: true };
  });

export const deleteShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("shipments").delete().eq("id", data.id);
    if (error) fail("deleteShipment", error, "Could not delete shipment");
    return { ok: true };
  });

export const getShipment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: shipment, error } = await supabaseAdmin
      .from("shipments")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) fail("getShipment", error, "Shipment not found");
    const { data: events } = await supabaseAdmin
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", data.id)
      .order("sequence", { ascending: true });
    return { shipment, events: events ?? [] };
  });

const EventInput = z.object({
  shipment_id: z.string().uuid(),
  label: z.string().min(1).max(200),
  location: z.string().max(200).optional().nullable(),
  event_time: z.string().optional().nullable().or(z.literal("")),
  sequence: z.number().int().min(0).max(9999).default(0),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const addEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EventInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      ...data,
      event_time: data.event_time ? new Date(data.event_time).toISOString() : new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from("shipment_events").insert(payload);
    if (error) fail("addEvent", error, "Could not add event");
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("shipment_events").delete().eq("id", data.id);
    if (error) fail("deleteEvent", error, "Could not delete event");
    return { ok: true };
  });
