import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import warehouseImg from "@/assets/warehouse.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Logiport" },
      { name: "description", content: "We move the world's cargo with a tracking-first platform built for clarity." },
      { property: "og:title", content: "About Logiport" },
      { property: "og:description", content: "A tracking-first logistics company moving cargo for 15 years." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative pt-32 pb-20 bg-primary text-primary-foreground">
        <img src={warehouseImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative mx-auto max-w-4xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">About us</span>
          <h1 className="mt-2 text-5xl md:text-6xl font-bold">Logistics, made visible.</h1>
          <p className="mt-6 text-lg text-primary-foreground/80 max-w-2xl">
            Logiport was founded in 2011 with a stubborn idea: shippers shouldn't have to guess
            where their cargo is. We built a global freight network around a tracking platform —
            not the other way around.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-20 prose prose-neutral max-w-none">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Today, Logiport moves more than 12 million shipments a year across ocean, air, and road,
          serving 180 countries. Every shipment — from a single pallet to a 40-foot container —
          gets the same treatment: a live tracking ID, status pings every 15 minutes, and a team
          that picks up the phone.
        </p>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          We believe the best logistics company isn't the one with the most trucks. It's the one
          that tells you the truth, in real time, about where your goods are.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
