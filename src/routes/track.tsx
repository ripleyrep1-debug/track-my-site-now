import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Package, MapPin, Clock, Truck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackingForm } from "@/components/TrackingForm";
import heroPort from "@/assets/hero-port.jpg";
import { z } from "zod";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/track")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Track your shipment — Logiport" },
      { name: "description", content: "Enter a tracking number to see live status, current location, and delivery ETA." },
      { property: "og:title", content: "Track your shipment — Logiport" },
      { property: "og:description", content: "Live shipment tracking with full timeline." },
    ],
  }),
  component: TrackPage,
});

type Stage = { label: string; location: string; time: string; done: boolean; current?: boolean };

function generateTimeline(id: string): { stages: Stage[]; origin: string; destination: string; eta: string; carrier: string } {
  // deterministic mock from id
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const step = h % 5; // 0..4 → which stage
  const cities = [
    ["Shanghai, CN", "Rotterdam, NL"],
    ["Los Angeles, US", "Hamburg, DE"],
    ["Singapore, SG", "New York, US"],
    ["Dubai, AE", "Felixstowe, UK"],
  ];
  const [origin, destination] = cities[h % cities.length];
  const baseStages = [
    { label: "Order received", location: origin, time: "May 14, 09:12" },
    { label: "Picked up", location: origin, time: "May 15, 14:30" },
    { label: "In transit", location: "Mid-Atlantic", time: "May 18, 22:05" },
    { label: "Arrived at port", location: destination, time: "May 21, 06:48" },
    { label: "Out for delivery", location: destination, time: "May 22, 08:15" },
    { label: "Delivered", location: destination, time: "May 22, 17:40" },
  ];
  const stages: Stage[] = baseStages.map((s, i) => ({
    ...s,
    done: i <= step,
    current: i === step,
  }));
  return { stages, origin, destination, eta: "May 23, 18:00", carrier: "Logiport Express" };
}

function TrackPage() {
  const { id } = Route.useSearch();
  const tracking = id?.trim();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <section className="relative pt-32 pb-16 bg-primary text-primary-foreground">
        <img src={heroPort} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative mx-auto max-w-5xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold">Track your shipment</h1>
          <p className="mt-3 text-primary-foreground/80 max-w-xl">
            Enter the tracking number from your confirmation email or shipping label.
          </p>
          <div className="mt-8">
            <TrackingForm variant="page" />
          </div>
        </div>
      </section>

      <section className="flex-1 mx-auto max-w-5xl w-full px-6 py-16">
        {!tracking ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <p className="mt-4 text-muted-foreground">Enter a tracking number above to view your shipment status.</p>
          </div>
        ) : (
          <TrackingResult id={tracking} />
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function TrackingResult({ id }: { id: string }) {
  const { stages, origin, destination, eta, carrier } = generateTimeline(id);
  const currentStage = stages.find((s) => s.current) ?? stages[stages.length - 1];

  return (
    <div className="space-y-8">
      <div className="rounded-sm border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tracking ID</div>
            <div className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>{id}</div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-sm bg-accent/15 text-accent px-3 py-1.5 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            {currentStage.label}
          </span>
        </div>
        <div className="mt-6 grid sm:grid-cols-4 gap-6 text-sm">
          <Info icon={MapPin} label="Origin" value={origin} />
          <Info icon={MapPin} label="Destination" value={destination} />
          <Info icon={Clock} label="ETA" value={eta} />
          <Info icon={Truck} label="Carrier" value={carrier} />
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-8">
        <h2 className="text-xl font-bold text-primary mb-6">Shipment timeline</h2>
        <ol className="space-y-1">
          {stages.map((s, i) => (
            <li key={i} className="flex gap-4 pb-6 relative">
              {i !== stages.length - 1 && (
                <span className={`absolute left-[11px] top-7 bottom-0 w-px ${s.done ? "bg-accent" : "bg-border"}`} />
              )}
              {s.done ? (
                <CheckCircle2 className={`h-6 w-6 shrink-0 ${s.current ? "text-accent" : "text-accent/70"}`} />
              ) : (
                <Circle className="h-6 w-6 shrink-0 text-muted-foreground/40" />
              )}
              <div className="flex-1 flex justify-between flex-wrap gap-2">
                <div>
                  <div className={`font-semibold ${s.done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</div>
                  <div className="text-sm text-muted-foreground">{s.location}</div>
                </div>
                <div className="text-sm text-muted-foreground">{s.time}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 font-semibold text-primary">{value}</div>
    </div>
  );
}
