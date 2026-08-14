"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";

export function AuthScreen() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const auth = async () => {
    if (!configured) return;
    setLoading(true);
    const client = createClient();
    const response = mode === "sign-in"
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setLoading(false);
    if (response.error) return toast.error(response.error.message);
    if (mode === "sign-up") toast.success("Check your inbox to confirm your account.");
    else location.assign("/app/overview");
  };

  const oauth = async () => {
    if (!configured) return;
    setLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
  };

  const points = [
    "Balances derived from your ledger",
    "Clear separation of cash, reserves, and spending",
    "Personal data protected at database level",
  ];

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_.9fr]">
        <section className="relative hidden overflow-hidden border-r border-[var(--line)] p-12 lg:flex lg:flex-col">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_10%_10%,rgba(167,181,255,.14),transparent_27%),radial-gradient(circle_at_80%_80%,rgba(126,200,227,.10),transparent_30%)]" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] font-bold text-[#161a2a]">F</div>
            <span className="font-display text-xl font-semibold">finwise</span>
          </div>
          <div className="relative my-auto max-w-xl">
            <p className="mb-5 text-xs font-medium uppercase tracking-[.2em] text-[var(--accent)]">A calmer money practice</p>
            <h1 className="font-display text-5xl font-semibold leading-[1.04] tracking-tight">Know what your money is doing — without the noise.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[var(--muted)]">A private, structured workspace for everyday money decisions and the long view.</p>
            <div className="mt-10 grid gap-4">
              {points.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <CheckCircle2 size={17} className="text-[var(--accent)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <p className="relative text-xs text-[var(--muted)]">Designed for deliberate financial visibility.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] font-bold text-[#161a2a]">F</div>
              <span className="font-display text-xl font-semibold">finwise</span>
            </div>
            <p className="text-xs font-medium uppercase tracking-[.18em] text-[var(--muted)]">Private workspace</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">{mode === "sign-in" ? "Welcome back" : "Create your workspace"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{mode === "sign-in" ? "Sign in to continue where you left off." : "Your financial workspace starts clean and stays yours."}</p>

            {!configured ? (
              <div className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100">
                <LockKeyhole className="mb-3" size={19} />
                Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code> before signing in.
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-4">
                  <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
                  <Field label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} /></Field>
                  <Button size="lg" onClick={auth} disabled={loading || !email || password.length < 6}>
                    {mode === "sign-in" ? "Sign in" : "Create account"}<ArrowRight size={17} />
                  </Button>
                </div>
                <div className="my-6 flex items-center gap-3 text-xs text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">or</div>
                <Button variant="quiet" size="lg" className="w-full" onClick={oauth} disabled={loading}><Sparkle size={16} />Continue with Google</Button>
                <p className="mt-7 text-center text-sm text-[var(--muted)]">
                  {mode === "sign-in" ? "New to Finwise?" : "Already have an account?"}{" "}
                  <button className="font-medium text-[var(--accent)] hover:underline" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
                    {mode === "sign-in" ? "Create an account" : "Sign in"}
                  </button>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
