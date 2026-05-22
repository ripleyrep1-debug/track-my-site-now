import { createFileRoute, Link } from "@tanstack/react-router";
import { Ship, Plane, Truck, Warehouse, ShieldCheck, Clock, Globe2, ArrowRight } from "lucide-react";
import heroPort from "@/assets/hero-port.jpg";
import trucksImg from "@/assets/trucks.jpg";
import airImg from "@/assets/airfreight.jpg";
import warehouseImg from "@/assets/warehouse.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackingForm } from "@/components/TrackingForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Logiport — Global Logistics & Real-Time Shipment Tracking" },
      {
        name: "description",
        content:
          "Track shipments in real time across ocean, air, and road. Logiport powers global supply chains with transparent, on-time delivery.",
      },
      { property: "og:title", content: "Logiport — Global Logistics & Tracking" },
      { property: "og:description", content: "Real-time tracking for ocean, air, and road freight." },
      { property: "og:image", content: heroPort },
    ],
  }),
  component: Index,
});

const services = [
  { icon: Ship, title: "Ocean Freight", desc: "FCL & LCL services across 400+ ports worldwide.", img: heroPort },
  { icon: Plane, title: "Air Freight", desc: "Time-critical air cargo with priority handling.", img: airImg },
  { icon: Truck, title: "Road Transport", desc: "Cross-border trucking with full traceability.", img: trucksImg },
  { icon: Warehouse, title: "Warehousing", desc: "Smart storage with inventory in real time.", img: warehouseImg },
];

const stats = [
  { value: "12M+", label: "Shipments delivered" },
  { value: "180", label: "Countries served" },
  { value: "99.4%", label: "On-time rate" },
  { value: "24/7", label: "Live tracking" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative min-h-[760px] flex items-center">
        <img
          src={heroPort}
          alt="Container port at sunset"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-7xl w-full px-6 pt-32 pb-20 text-background">
          <div className="max-w-3xl">
            <span className="inline-block rounded-sm bg-accent/15 border border-accent/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
              Logistics, simplified
            </span>
            <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              Move freight.<br />
              <span className="text-accent">Track every mile.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-background/80 max-w-2xl">
              From the dock to the doorstep — monitor every shipment in real time across ocean,
              air, and road with a single tracking ID.
            </p>
          </div>

          <div className="mt-12 max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-widest text-background/70 mb-3">
              Track your shipment
            </p>
            <TrackingForm />
            <p className="mt-3 text-xs text-background/60">
              Try a sample: <button
                type="button"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('input[aria-label="Tracking number"]');
                  if (input) { input.value = "LGP-2026-00482"; input.dispatchEvent(new Event("input", { bubbles: true })); }
                }}
                className="underline hover:text-accent"
              >LGP-2026-00482</button>
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-secondary">
        <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">What we do</span>
            <h2 className="mt-2 text-4xl md:text-5xl font-bold text-primary">End-to-end freight services</h2>
          </div>
          <Link to="/services" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent">
            All services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <div key={s.title} className="group rounded-sm overflow-hidden bg-card border border-border hover:shadow-[var(--shadow-elegant)] transition-all">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={s.img} alt={s.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
              <div className="p-6">
                <s.icon className="h-7 w-7 text-accent" />
                <h3 className="mt-3 text-xl font-bold text-primary">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Why Logiport</span>
            <h2 className="mt-2 text-4xl md:text-5xl font-bold">A smarter way to move the world's cargo.</h2>
            <p className="mt-4 text-primary-foreground/70 text-lg">
              We combine global infrastructure with a tracking platform built for clarity. No more
              "out for delivery" black boxes — see exactly where your shipment is, always.
            </p>
            <div className="mt-10 grid sm:grid-cols-2 gap-6">
              {[
                { icon: Globe2, title: "Global network", desc: "Coverage in 180 countries with local expertise." },
                { icon: Clock, title: "Real-time updates", desc: "Live position pings every 15 minutes." },
                { icon: ShieldCheck, title: "Cargo insurance", desc: "Full-value protection on every shipment." },
                { icon: Truck, title: "Door-to-door", desc: "One ID, one team, from origin to destination." },
              ].map((f) => (
                <div key={f.title} className="flex gap-3">
                  <f.icon className="h-6 w-6 text-accent shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold">{f.title}</div>
                    <div className="text-sm text-primary-foreground/70">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img src={warehouseImg} alt="Warehouse" loading="lazy" className="rounded-sm shadow-[var(--shadow-elegant)] w-full" width={1280} height={800} />
            <div className="absolute -bottom-6 -left-6 bg-accent text-accent-foreground p-6 rounded-sm shadow-[var(--shadow-accent)] hidden md:block">
              <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>15 yrs</div>
              <div className="text-sm">moving cargo</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-primary">Ready to ship?</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Get a quote in minutes, or track an existing shipment right now.
        </p>
        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          <Link to="/contact" className="rounded-sm bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
            Request a quote
          </Link>
          <Link to="/track" className="rounded-sm bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition shadow-[var(--shadow-accent)]">
            Track shipment
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
