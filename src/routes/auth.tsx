import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/admin" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <Link to="/" className="text-sm text-slate-500 hover:underline">← Back to site</Link>
        <h1 className="text-2xl font-bold mt-3 mb-1">Admin sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Rapidexpresscargo shipment management</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email" required autoFocus autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email" className="w-full border rounded px-3 py-2"
          />
          <input
            type="password" required minLength={6} autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password" className="w-full border rounded px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded font-medium">
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          Restricted access. Contact the system owner if you need credentials.
        </p>
      </div>
    </div>
  );
}
