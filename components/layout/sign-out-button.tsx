"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  return <button className="hidden items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-[var(--muted)] transition hover:bg-[var(--raised)] hover:text-[var(--ink)] sm:flex" onClick={() => { void createClient().auth.signOut().then(() => location.assign("/auth")); }}><LogOut size={15} />Sign out</button>;
}
