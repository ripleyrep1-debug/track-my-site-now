import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-sm bg-accent text-accent-foreground">
              <Package className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Logiport
            </span>
          </div>
          <p className="mt-4 text-sm text-sidebar-foreground/70">
            Global logistics and real-time shipment tracking, built for modern supply chains.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li><Link to="/about" className="hover:text-accent">About</Link></li>
            <li><Link to="/services" className="hover:text-accent">Services</Link></li>
            <li><Link to="/contact" className="hover:text-accent">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Services</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li>Ocean Freight</li>
            <li>Air Freight</li>
            <li>Road Transport</li>
            <li>Warehousing</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li>+1 (555) 010-2030</li>
            <li>hello@logiport.co</li>
            <li>240 Harbor Drive, NYC</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-sidebar-foreground/60 flex justify-between">
          <span>© {new Date().getFullYear()} Logiport. All rights reserved.</span>
          <span>Delivered worldwide.</span>
        </div>
      </div>
    </footer>
  );
}
