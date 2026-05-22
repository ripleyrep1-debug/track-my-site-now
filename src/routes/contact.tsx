import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Logiport" },
      { name: "description", content: "Get in touch with our logistics team for quotes, support, or partnership inquiries." },
      { property: "og:title", content: "Contact Logiport" },
      { property: "og:description", content: "Quotes, support and partnership inquiries." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="pt-32 pb-12 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Get in touch</span>
          <h1 className="mt-2 text-5xl md:text-6xl font-bold">Let's move something.</h1>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <Detail icon={Phone} label="Phone" value="+1 (555) 010-2030" />
          <Detail icon={Mail} label="Email" value="hello@logiport.co" />
          <Detail icon={MapPin} label="Headquarters" value="240 Harbor Drive, New York, NY 10004" />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="rounded-sm border border-border bg-card p-8 space-y-4 shadow-[var(--shadow-elegant)]"
        >
          {sent ? (
            <div className="py-8 text-center">
              <h3 className="text-2xl font-bold text-primary">Thanks — we'll be in touch.</h3>
              <p className="mt-2 text-muted-foreground">Our team replies within one business day.</p>
            </div>
          ) : (
            <>
              <Field label="Name" type="text" />
              <Field label="Email" type="email" />
              <Field label="Subject" type="text" />
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Message</label>
                <textarea required rows={4} className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 outline-none focus:border-accent" />
              </div>
              <button type="submit" className="w-full rounded-sm bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 transition shadow-[var(--shadow-accent)]">
                Send message
              </button>
            </>
          )}
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, type }: { label: string; type: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input required type={type} className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 outline-none focus:border-accent" />
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="grid h-12 w-12 place-items-center rounded-sm bg-accent/15 text-accent shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold text-primary">{value}</div>
      </div>
    </div>
  );
}
