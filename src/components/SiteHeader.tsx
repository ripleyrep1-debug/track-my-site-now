import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";

export function SiteHeader() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/track", label: "Track" },
    { to: "/services", label: "Services" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ] as const;

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-background">
          <span className="grid h-9 w-9 place-items-center rounded-sm bg-accent text-accent-foreground">
            <Package className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Logiport
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-background/90">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="hover:text-accent transition-colors"
              activeProps={{ className: "text-accent" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/track"
          className="hidden md:inline-flex items-center rounded-sm bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition"
        >
          Track Shipment
        </Link>
      </div>
    </header>
  );
}
