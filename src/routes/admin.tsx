import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyStatus, claimFirstAdmin, listShipments,
  createShipment, updateShipment, deleteShipment,
  getShipment, addEvent, deleteEvent,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const statusFn = useServerFn(getMyStatus);
  const claimFn = useServerFn(claimFirstAdmin);
  const listFn = useServerFn(listShipments);
  const createFn = useServerFn(createShipment);
  const updateFn = useServerFn(updateShipment);
  const deleteFn = useServerFn(deleteShipment);
  const getOneFn = useServerFn(getShipment);
  const addEvFn = useServerFn(addEvent);
  const delEvFn = useServerFn(deleteEvent);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setSessionReady(true);
      if (!data.session) nav({ to: "/auth" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s);
      if (!s) nav({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const status = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => statusFn(),
    enabled: signedIn,
  });

  const shipments = useQuery({
    queryKey: ["shipments"],
    queryFn: () => listFn(),
    enabled: signedIn && !!status.data?.isAdmin,
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    tracking_number: "", customer_name: "", customer_email: "",
    origin: "", destination: "", carrier: "Rapidexpresscargo Express",
    status: "Order received", eta: "", service: "", weight: "", notes: "",
    origin_warehouse: "" as "" | "Greece" | "Poland" | "Germany",
    transit_days: 5,
    auto_progress: true,
    ship_started_at: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = {
        ...form,
        origin_warehouse: form.origin_warehouse || null,
        transit_days: form.auto_progress ? form.transit_days : null,
        ship_started_at: form.ship_started_at || null,
      };
      await createFn({ data: payload });
      setForm({ ...form, tracking_number: "", customer_name: "", customer_email: "", origin: "", destination: "", eta: "", notes: "", ship_started_at: "" });
      qc.invalidateQueries({ queryKey: ["shipments"] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!sessionReady) return <div className="p-8">Loading…</div>;
  if (!signedIn) return <Navigate to="/auth" />;

  if (status.isLoading) return <div className="p-8">Checking access…</div>;
  if (!status.data?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md bg-white p-8 rounded shadow text-center">
          <h1 className="text-xl font-bold mb-2">Admin access required</h1>
          {status.data?.canClaimAdmin ? (
            <>
              <p className="text-sm text-slate-600 mb-4">No admin exists yet. Claim the admin role for this account to manage shipments.</p>
              <button
                onClick={async () => {
                  try { await claimFn({}); status.refetch(); }
                  catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
                }}
                className="bg-orange-600 text-white px-4 py-2 rounded font-medium"
              >Make me admin</button>
            </>
          ) : (
            <p className="text-sm text-slate-600">Your account is not an admin. Ask the existing admin to grant access.</p>
          )}
          <button onClick={() => supabase.auth.signOut()} className="mt-4 text-sm text-slate-500 hover:underline block w-full">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Shipment admin</h1>
            <p className="text-xs text-slate-500">Manage tracking records for customers</p>
          </div>
          <div className="flex gap-3">
            <Link to="/" className="text-sm text-slate-600 hover:underline self-center">View site</Link>
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-600 hover:underline">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="bg-white rounded shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Shipments</h2>
            <button onClick={() => shipments.refetch()} className="text-sm text-slate-500 hover:underline">Refresh</button>
          </div>
          {shipments.isLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading…</div>
          ) : shipments.data?.shipments.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No shipments yet. Create one to get started.</div>
          ) : (
            <ul className="divide-y">
              {shipments.data?.shipments.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-mono font-semibold">{s.tracking_number}</div>
                      <div className="text-xs text-slate-500">{s.origin} → {s.destination} · {s.customer_name || "—"}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-700 font-medium">{s.status}</span>
                  </button>
                  {expanded === s.id && (
                    <ShipmentDetail
                      id={s.id}
                      getOneFn={getOneFn} updateFn={updateFn} deleteFn={deleteFn}
                      addEvFn={addEvFn} delEvFn={delEvFn}
                      onChanged={() => qc.invalidateQueries({ queryKey: ["shipments"] })}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="bg-white rounded shadow-sm p-5 h-fit">
          <h2 className="font-semibold mb-3">Create shipment</h2>
          <form onSubmit={submitCreate} className="space-y-2 text-sm">
            <Field label="Tracking number" required value={form.tracking_number} onChange={(v) => setForm({ ...form, tracking_number: v })} placeholder="LGP-2026-00482" />
            <Field label="Customer name" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} />
            <Field label="Customer email" type="email" value={form.customer_email} onChange={(v) => setForm({ ...form, customer_email: v })} />
            <Field label="Origin" required value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} placeholder="Shanghai, CN" />
            <Field label="Destination" required value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} placeholder="Rotterdam, NL" />
            <Field label="Carrier" value={form.carrier} onChange={(v) => setForm({ ...form, carrier: v })} />
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
              options={["Order received","Picked up","Left the warehouse","In transit","Arrived at port","Customs clearance","Out for delivery","On hold","Delivered","Failed delivery","Returned"]} />
            <Field label="ETA" type="datetime-local" value={form.eta} onChange={(v) => setForm({ ...form, eta: v })} />
            <Field label="Service" value={form.service} onChange={(v) => setForm({ ...form, service: v })} placeholder="Ocean freight" />
            <Field label="Weight" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} placeholder="12 kg" />

            <div className="mt-3 pt-3 border-t space-y-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Auto tracking</p>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={form.auto_progress}
                  onChange={(e) => setForm({ ...form, auto_progress: e.target.checked })} />
                Automatically progress timeline events
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Origin warehouse</span>
                <select value={form.origin_warehouse}
                  onChange={(e) => setForm({ ...form, origin_warehouse: e.target.value as typeof form.origin_warehouse })}
                  className="w-full border rounded px-2 py-1.5 mt-0.5 bg-white">
                  <option value="">— None (manual) —</option>
                  <option value="Greece">Greece (Athens)</option>
                  <option value="Poland">Poland (Warsaw)</option>
                  <option value="Germany">Germany (Frankfurt)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Transit time (days)</span>
                <select value={form.transit_days}
                  disabled={!form.auto_progress}
                  onChange={(e) => setForm({ ...form, transit_days: parseInt(e.target.value, 10) })}
                  className="w-full border rounded px-2 py-1.5 mt-0.5 bg-white disabled:opacity-50">
                  {[3,4,5,6,7].map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </label>
              <Field label="Ship start (optional, defaults to now)" type="datetime-local"
                value={form.ship_started_at} onChange={(v) => setForm({ ...form, ship_started_at: v })} />
              <p className="text-[11px] text-slate-500">When enabled, events from "Order received" → "Delivered" are inserted automatically over the chosen window. Updates run every 15 minutes.</p>
            </div>

            {formError && <p className="text-red-600 text-xs">{formError}</p>}
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded font-medium">Create</button>
          </form>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}{required && " *"}</span>
      <input type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-2 py-1.5 mt-0.5" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-2 py-1.5 mt-0.5 bg-white">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

type Fn<T, R> = (args: { data: T }) => Promise<R>;

function ShipmentDetail({ id, getOneFn, updateFn, deleteFn, addEvFn, delEvFn, onChanged }: {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOneFn: Fn<{ id: string }, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFn: Fn<{ id: string; patch: any }, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteFn: Fn<{ id: string }, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEvFn: Fn<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delEvFn: Fn<{ id: string }, any>;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => getOneFn({ data: { id } }),
  });
  const [evLabel, setEvLabel] = useState("");
  const [evLoc, setEvLoc] = useState("");
  const [evTime, setEvTime] = useState("");
  const [evSeq, setEvSeq] = useState("0");
  const [evLat, setEvLat] = useState("");
  const [evLng, setEvLng] = useState("");
  const [status, setStatus] = useState<string>("");

  const STATUS_OPTIONS = ["Order received","Picked up","Left the warehouse","In transit","Arrived at port","Customs clearance","Out for delivery","On hold","Delivered","Failed delivery","Returned"];

  useEffect(() => { if (q.data?.shipment?.status) setStatus(q.data.shipment.status); }, [q.data]);

  if (q.isLoading) return <div className="px-5 py-4 text-sm text-slate-500 bg-slate-50">Loading…</div>;
  const s = q.data?.shipment;
  if (!s) return null;

  return (
    <div className="bg-slate-50 px-5 py-4 border-t space-y-4">
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Info label="Customer">{s.customer_name || "—"}</Info>
        <Info label="Email">{s.customer_email || "—"}</Info>
        <Info label="Carrier">{s.carrier}</Info>
        <Info label="ETA">{s.eta ? new Date(s.eta).toLocaleString() : "—"}</Info>
      </div>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-slate-600">Status:</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-2 py-1 bg-white">
          {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        <button
          onClick={async () => { await updateFn({ data: { id, patch: { status } } }); qc.invalidateQueries({ queryKey: ["shipment", id] }); onChanged(); }}
          className="px-3 py-1 bg-slate-800 text-white rounded text-xs"
        >Save status</button>
        <button
          onClick={async () => { if (confirm("Delete this shipment?")) { await deleteFn({ data: { id } }); onChanged(); } }}
          className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-xs"
        >Delete</button>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">Timeline events</h4>
        <ul className="space-y-1 mb-3">
          {q.data.events.map((ev: { id: string; label: string; location: string | null; event_time: string; sequence: number; latitude: number | null; longitude: number | null }) => (
            <li key={ev.id} className="flex items-center gap-2 bg-white border rounded px-3 py-2 text-sm">
              <span className="text-xs text-slate-400 w-6">{ev.sequence}</span>
              <div className="flex-1">
                <div className="font-medium">{ev.label}</div>
                <div className="text-xs text-slate-500">
                  {ev.location || "—"} · {new Date(ev.event_time).toLocaleString()}
                  {ev.latitude != null && ev.longitude != null && <span className="ml-1 text-slate-400">({ev.latitude.toFixed(3)}, {ev.longitude.toFixed(3)})</span>}
                </div>
              </div>
              <button onClick={async () => { await delEvFn({ data: { id: ev.id } }); qc.invalidateQueries({ queryKey: ["shipment", id] }); }} className="text-xs text-red-600">Remove</button>
            </li>
          ))}
          {q.data.events.length === 0 && <li className="text-xs text-slate-500">No events yet.</li>}
        </ul>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const payload: Record<string, unknown> = {
              shipment_id: id, label: evLabel, location: evLoc || null,
              event_time: evTime, sequence: parseInt(evSeq || "0", 10),
            };
            if (evLat && evLng) {
              payload.latitude = parseFloat(evLat);
              payload.longitude = parseFloat(evLng);
            }
            await addEvFn({ data: payload });
            setEvLabel(""); setEvLoc(""); setEvTime(""); setEvLat(""); setEvLng("");
            setEvSeq(String((q.data.events.length || 0) + 1));
            qc.invalidateQueries({ queryKey: ["shipment", id] });
          }}
          className="space-y-2 text-sm"
        >
          <div className="grid grid-cols-[1fr_1fr_1fr_70px_auto] gap-2">
            <select required value={evLabel} onChange={(e) => setEvLabel(e.target.value)} className="border rounded px-2 py-1.5 bg-white">
              <option value="">— Select status —</option>
              {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <input placeholder="Location (e.g. Shanghai Port)" value={evLoc} onChange={(e) => setEvLoc(e.target.value)} className="border rounded px-2 py-1.5" />
            <input type="datetime-local" value={evTime} onChange={(e) => setEvTime(e.target.value)} className="border rounded px-2 py-1.5" />
            <input type="number" min={0} value={evSeq} onChange={(e) => setEvSeq(e.target.value)} className="border rounded px-2 py-1.5" placeholder="Seq" />
            <button className="bg-orange-600 text-white px-3 rounded text-sm">Add</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="any" placeholder="Latitude (optional, -90 to 90)" value={evLat} onChange={(e) => setEvLat(e.target.value)} className="border rounded px-2 py-1.5" />
            <input type="number" step="any" placeholder="Longitude (optional, -180 to 180)" value={evLng} onChange={(e) => setEvLng(e.target.value)} className="border rounded px-2 py-1.5" />
          </div>
          <p className="text-xs text-slate-500">Tip: tap a place on Google Maps → right-click → copy coordinates. Latest event with coordinates shows as the live location on the customer map.</p>
        </form>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}
