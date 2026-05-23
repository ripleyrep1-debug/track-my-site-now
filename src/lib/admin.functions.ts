import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminAlreadyExists, getAdminDb, hasAdminRole } from "@/lib/admin.server";

type AuthContext = {
  userId: string;
};

function fail(scope: string, error: unknown, generic = "Operation failed"): never {
  const msg =
    error && typeof error === "object" && "message" in error
      ? (error as { message: string }).message
      : String(error);
  console.error(`[admin:${scope}]`, msg);
  throw new Error(generic);
}

async function assertAdmin(userId: string) {
  let isAdmin = false;
  try {
    isAdmin = await hasAdminRole(userId);
  } catch (error) {
    fail("assertAdmin", error, "Authorization check failed");
  }
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as AuthContext;
    let isAdmin = false;
    let exists = true;
    try {
      [isAdmin, exists] = await Promise.all([hasAdminRole(userId), adminAlreadyExists()]);
    } catch (error) {
      fail("getMyStatus", error, "Could not load your account");
    }

    return {
      userId,
      isAdmin,
      adminCount: exists ? 1 : 0,
      canClaimAdmin: !isAdmin && !exists,
    };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as AuthContext;
    if (await adminAlreadyExists()) throw new Error("An admin already exists");
    const { error } = await getAdminDb().from("user_roles").insert({ user_id: userId, role: "admin" });
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
    const { userId } = context as AuthContext;
    await assertAdmin(userId);
    const { data, error } = await getAdminDb()
      .from("shipments")
      .select(
        "id, tracking_number, customer_name, customer_email, origin, destination, status, eta, updated_at",
      )
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
  origin_warehouse: z.enum(["Greece", "Poland", "Germany"]).optional().nullable(),
  transit_days: z.number().int().min(3).max(7).optional().nullable(),
  auto_progress: z.boolean().optional().default(false),
  ship_started_at: z.string().optional().nullable().or(z.literal("")),
});

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShipmentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as AuthContext;
    await assertAdmin(userId);
    const db = getAdminDb();
    const payload = {
      ...data,
      customer_email: data.customer_email || null,
      eta: data.eta ? new Date(data.eta).toISOString() : null,
      ship_started_at: data.ship_started_at
        ? new Date(data.ship_started_at).toISOString()
        : data.auto_progress
          ? new Date().toISOString()
          : null,
    };
    const { data: row, error } = await db.from("shipments").insert(payload).select().single();
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
    const { userId } = context as AuthContext;
    await assertAdmin(userId);
    const patch = { ...data.patch } as Record<string, unknown>;
    if ("eta" in patch) patch.eta = patch.eta ? new Date(patch.eta as string).toISOString() : null;
    if ("customer_email" in patch && !patch.customer_email) patch.customer_email = null;
    if ("ship_started_at" in patch)
      patch.ship_started_at = patch.ship_started_at
        ? new Date(patch.ship_started_at as string).toISOString()
        : null;
    const { error } = await getAdminDb().from("shipments").update(patch as never).eq("id", data.id);
    if (error) fail("updateShipment", error, "Could not update shipment");
    return { ok: true };
  });

export const deleteShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as AuthContext;
    await assertAdmin(userId);
    const { error } = await getAdminDb().from("shipments").delete().eq("id", data.id);
    if (error) fail("deleteShipment", error, "Could not delete shipment");
    return { ok: true };
  });

export const getShipment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as AuthContext;
    await assertAdmin(userId);
    const db = getAdminDb();
    const { data: shipment, error } = await db
      .from("shipments")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) fail("getShipment", error, "Shipment not found");
    const { data: events } = await db
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
    const { userId } = context as AuthContext;
    await assertAdmin(userId);
    const payload = {
      ...data,
      event_time: data.event_time ? new Date(data.event_time).toISOString() : new Date().toISOString(),
    };
    const { error } = await getAdminDb().from("shipment_events").insert(payload);
    if (error) fail("addEvent", error, "Could not add event");
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as AuthContext;
    await assertAdmin(userId);
    const { error } = await getAdminDb().from("shipment_events").delete().eq("id", data.id);
    if (error) fail("deleteEvent", error, "Could not delete event");
    return { ok: true };
  });
