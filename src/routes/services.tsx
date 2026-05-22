import { createFileRoute } from "@tanstack/react-router";
import { Ship, Plane, Truck, Warehouse, Boxes, Globe2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroPort from "@/assets/hero-port.jpg";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Logiport" },
      { name: "description", content: "Ocean, air, road, warehousing and supply chain services from Logiport." },
      { property: "og:title", content: "Services — Logiport" },
      { property: "og:description", content: "Full-stack logistics across every mode of transport." },
    ],
  }),
  component: Services,
});

const services = [
  { icon: Ship, title: "Ocean Freight", desc: "FCL and LCL options to 400+ ports, with priority slots on major lanes." },
  { icon: Plane, title: "Air Freight", desc: "Express and standard air cargo, including charter for time-critical loads." },
  { icon: Truck, title: "Road Transport", desc: "FTL and LTL trucking across North America and Europe with live ETAs." },
  { icon: Warehouse, title: "Warehousing", desc: "Bonded and standard storage with WMS integration and real-time stock." },
  { icon: Boxes, title: "Fulfillment", desc: "Pick, pack and last-mile delivery for D2C and B2B brands." },
  { icon: Globe2, title: "Customs & Trade", desc: "Brokerage, compliance and tariff classification in 60+ jurisdictions." },
];

function Services() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative pt-32 pb-20 bg-primary text-primary-foreground">
        <img src={heroPort} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative mx-auto max-w-7xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Services</span>
          <h1 className="mt-2 text-5xl md:text-6xl font-bold max-w-3xl">
            Every mode of transport, one trusted partner.
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-20 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <div key={s.title} className="rounded-sm border border-border bg-card p-8 hover:border-accent transition-colors">
            <s.icon className="h-9 w-9 text-accent" />
            <h3 className="mt-4 text-xl font-bold text-primary">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
