import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

export function TrackingForm({ variant = "hero" }: { variant?: "hero" | "page" }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate({ to: "/track", search: { id: trimmed } });
  };

  const isHero = variant === "hero";

  return (
    <form
      onSubmit={onSubmit}
      className={
        isHero
          ? "bg-card/95 backdrop-blur rounded-sm p-2 flex flex-col sm:flex-row gap-2 shadow-[var(--shadow-elegant)] border border-border"
          : "bg-card rounded-sm p-2 flex flex-col sm:flex-row gap-2 shadow-[var(--shadow-elegant)] border border-border"
      }
    >
      <div className="flex items-center flex-1 gap-3 px-4">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter your tracking number (e.g. LGP-2026-00482)"
          className="flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground/70"
          aria-label="Tracking number"
        />
      </div>
      <button
        type="submit"
        className="rounded-sm bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 transition shadow-[var(--shadow-accent)]"
      >
        Track Now
      </button>
    </form>
  );
}
